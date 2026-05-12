import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Tags, ShoppingBag, ShoppingCart, Users, LogOut, Hexagon, MapPin, Building2, ChevronDown, Boxes, LifeBuoy, Search, Bell, Settings, TrendingUp, ArrowRight, X, Menu, MessageSquare, Lock } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';
import { requestNotificationPermission, onForegroundMessage } from '../firebase';
import logo from '../assets/logo.png';

const ALL_PAGES = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, keywords: ['home', 'overview', 'stats', 'metrics'], roles: ['superadmin', 'tenant', 'branch'] },
    { label: 'Tenants', path: '/admin/tenants', icon: Building2, keywords: ['tenant', 'business', 'accounts'], roles: ['superadmin'] },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingCart, keywords: ['order', 'sales', 'transactions', 'purchase'], roles: ['superadmin', 'tenant', 'branch'] },
    { label: 'Products', path: '/admin/products', icon: ShoppingBag, keywords: ['product', 'item', 'catalog', 'goods'], roles: ['superadmin', 'tenant', 'branch'] },
    { label: 'Product Sales', path: '/admin/product-sales', icon: TrendingUp, keywords: ['sales', 'analytics', 'revenue', 'performance', 'stats'], roles: ['superadmin', 'tenant', 'branch'] },
    { label: 'Categories', path: '/admin/categories', icon: Tags, keywords: ['category', 'group', 'tag', 'organize'], roles: ['superadmin', 'tenant', 'branch'] },
    { label: 'Customers', path: '/admin/customers', icon: Users, keywords: ['customer', 'user', 'audience', 'broadcast', 'whatsapp'], roles: ['superadmin', 'tenant', 'branch'] },
    { label: 'Inventory', path: '/admin/inventory', icon: Boxes, keywords: ['inventory', 'stock', 'warehouse', 'supply'], roles: ['superadmin', 'tenant', 'branch'] },
    { label: 'Offers', path: '/admin/offers', icon: Tags, keywords: ['offer', 'discount', 'coupon', 'promo', 'rules'], roles: ['superadmin', 'tenant', 'branch'] },
    { label: 'Support Desk', path: '/admin/support', icon: LifeBuoy, keywords: ['support', 'help', 'ticket', 'request', 'complaint'], roles: ['superadmin', 'tenant', 'branch'] },
    { label: 'Branches', path: '/admin/branches', icon: MapPin, keywords: ['branch', 'location', 'store', 'outlet', 'hub'], roles: ['superadmin', 'tenant'] },
    { label: 'Settings', path: '/admin/settings', icon: Settings, keywords: ['settings', 'config', 'preferences', 'razorpay', 'keys'], roles: ['tenant'] },
    { label: 'WhatsApp Flows', path: '/admin/whatsapp-settings', icon: MessageSquare, keywords: ['whatsapp', 'message', 'bot', 'conversation', 'auto-reply'], roles: ['tenant'] },
    { label: 'Change Password', path: '/admin/change-password', icon: Lock, keywords: ['password', 'security', 'account'], roles: ['superadmin', 'tenant', 'branch'] },
];

export default function DashboardLayout() {
    const navigate = useNavigate();
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(localStorage.getItem('selectedBranchId') || '');
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const searchRef = useRef(null);

    // Notification state
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [bellOpen, setBellOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const bellRef = useRef(null);

    const role = localStorage.getItem('adminRole');

    const filteredPages = useMemo(() => {
        const available = ALL_PAGES.filter(p => p.roles.includes(role));
        if (!searchQuery.trim()) return available;
        const q = searchQuery.toLowerCase();
        return available.filter(p =>
            p.label.toLowerCase().includes(q) ||
            p.keywords.some(k => k.includes(q))
        );
    }, [searchQuery, role]);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}?limit=10`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (e) {
            console.error('[Notifications] Fetch error:', e);
        }
    }, []);

    // Initialize FCM + fetch notifications
    useEffect(() => {
        const initFCM = async () => {
            try {
                const token = await requestNotificationPermission();
                if (token) {
                    // Only register if token is different from what we last registered
                    const lastToken = localStorage.getItem('fcmToken');
                    if (lastToken === token) {
                        console.log('[FCM] Token already registered this session');
                    } else {
                        const res = await fetch(API_ENDPOINTS.FCM_REGISTER, {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify({ token })
                        });

                        if (res.ok) {
                            localStorage.setItem('fcmToken', token);
                            console.log('[FCM] Token registered with backend');
                        } else {
                            throw new Error(`Server returned ${res.status}`);
                        }
                    }
                }
            } catch (e) {
                console.error('[FCM] Init error:', e.message);
            }
        };

        initFCM();
        fetchNotifications();
    }, [fetchNotifications]);

    // Listen for foreground messages
    useEffect(() => {
        const unsubscribe = onForegroundMessage((payload) => {
            const { title, body } = payload.notification || {};
            setToast({ title, body, type: payload.data?.type });
            fetchNotifications();

            // Auto-dismiss toast after 5 seconds
            setTimeout(() => setToast(null), 5000);
        });

        return () => unsubscribe && typeof unsubscribe === 'function' && unsubscribe();
    }, [fetchNotifications]);

    // Fetch branches for tenant
    useEffect(() => {
        if (role === 'tenant') {
            fetch(API_ENDPOINTS.BRANCHES, { headers: getHeaders() })
                .then(res => res.json())
                .then(data => setBranches(data))
                .catch(err => console.error(err));
        }
    }, [role]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocused(false);
            if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleBranchChange = (id, name) => {
        setSelectedBranchId(id);
        localStorage.setItem('selectedBranchId', id);
        localStorage.setItem('branchName', name || 'All Branches');
        window.location.reload();
    };

    const handleLogout = async () => {
        // Unregister FCM token
        const fcmToken = localStorage.getItem('fcmToken');
        if (fcmToken) {
            try {
                await fetch(API_ENDPOINTS.FCM_UNREGISTER, {
                    method: 'DELETE',
                    headers: getHeaders(),
                    body: JSON.stringify({ token: fcmToken })
                });
            } catch (e) { /* ignore */ }
            localStorage.removeItem('fcmToken');
        }

        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('branchId');
        localStorage.removeItem('branchName');
        localStorage.removeItem('selectedBranchId');
        navigate('/login');
    };

    const handlePageSelect = (path) => {
        navigate(path);
        setSearchQuery('');
        setSearchFocused(false);
    };

    const markAllRead = async () => {
        try {
            await fetch(API_ENDPOINTS.NOTIFICATIONS_READ, {
                method: 'PUT',
                headers: getHeaders()
            });
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (e) { /* ignore */ }
    };

    const getNotificationIcon = (type) => {
        if (type === 'new_order') return '🛒';
        if (type === 'support_request') return '🆘';
        if (type === 'low_stock') return '⚠️';
        return '🔔';
    };

    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="app-container">
            <aside className={`sidebar ${!isSidebarOpen ? 'hidden' : ''}`}>
                <div className="sidebar-header">
                    <div className="brand-logo">
                        <img src={logo} alt="Logo" />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px', color: 'var(--text-heading)' }}>
                        {localStorage.getItem('tenantName') || 'Friska'}
                    </div>
                </div>

                <div className="sidebar-nav">
                    <div className="nav-section-label">Overview</div>
                    <NavLink to="/admin" end className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={18} /> <span>Dashboard</span>
                    </NavLink>
                    {role === 'superadmin' && (
                        <NavLink to="/admin/tenants" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                            <Building2 size={18} /> <span>Tenants</span>
                        </NavLink>
                    )}

                    <div className="nav-section-label">Commerce</div>
                    <NavLink to="/admin/orders" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <ShoppingCart size={18} /> <span>Orders</span>
                    </NavLink>
                    <NavLink to="/admin/products" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <ShoppingBag size={18} /> <span>Products</span>
                    </NavLink>
                    <NavLink to="/admin/product-sales" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <TrendingUp size={18} /> <span>Product Sales</span>
                    </NavLink>
                    <NavLink to="/admin/categories" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <Tags size={18} /> <span>Categories</span>
                    </NavLink>
                    <NavLink to="/admin/customers" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <Users size={18} /> <span>Customers</span>
                    </NavLink>
                    <NavLink to="/admin/inventory" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <Boxes size={18} /> <span>Inventory</span>
                    </NavLink>
                    <NavLink to="/admin/offers" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <Tags size={18} /> <span>Offers</span>
                    </NavLink>

                    <div className="nav-section-label">Support</div>
                    <NavLink to="/admin/support" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <LifeBuoy size={18} /> <span>Help Desk</span>
                    </NavLink>
                    {(role === 'superadmin' || role === 'tenant') && (
                        <NavLink to="/admin/branches" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                            <MapPin size={18} /> <span>Branches</span>
                        </NavLink>
                    )}
                    {role === 'tenant' && (
                        <NavLink to="/admin/settings" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                            <Settings size={18} /> <span>Settings</span>
                        </NavLink>
                    )}
                    {role === 'tenant' && (
                        <NavLink to="/admin/whatsapp-settings" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                            <MessageSquare size={18} /> <span>WhatsApp Flows</span>
                        </NavLink>
                    )}
                    <NavLink to="/admin/change-password" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <Lock size={18} /> <span>Change Password</span>
                    </NavLink>
                </div>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="user-avatar">
                            {localStorage.getItem('adminName')?.charAt(0) || 'A'}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>{localStorage.getItem('adminName') || 'Admin User'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{role.charAt(0).toUpperCase() + role.slice(1)}</div>
                        </div>
                        <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            <div className={`content-wrapper ${!isSidebarOpen ? 'expanded' : ''}`}>
                <header className="top-nav">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        >
                            <Menu size={24} />
                        </button>
                        <div className="search-bar" ref={searchRef} style={{ position: 'relative' }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Go to page…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && filteredPages.length > 0) handlePageSelect(filteredPages[0].path);
                                    if (e.key === 'Escape') { setSearchFocused(false); setSearchQuery(''); }
                                }}
                            />
                            {searchFocused && (
                                <div className="search-dropdown">
                                    <div style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                                        {searchQuery ? `Results for "${searchQuery}"` : 'Quick Navigation'}
                                    </div>
                                    {filteredPages.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No matching pages.</div>
                                    ) : (
                                        filteredPages.map(page => {
                                            const Icon = page.icon;
                                            return (
                                                <div key={page.path} onClick={() => handlePageSelect(page.path)} className="search-dropdown-item">
                                                    <div style={{ width: '36px', height: '36px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div>{page.label}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>{page.path}</div>
                                                    </div>
                                                    <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="top-nav-actions">
                        {role === 'tenant' && branches.length > 0 && (
                            <div className="hub-selector-wrapper" style={{ position: 'relative' }}>
                                <button
                                    className="btn-outline"
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', border: 'none', background: '#f1f5f9' }}
                                    onClick={() => setIsHubOpen(!isHubOpen)}
                                >
                                    <Building2 size={16} />
                                    <span>{branches.find(b => String(b.id) === String(selectedBranchId))?.name || 'All Branches'}</span>
                                    <ChevronDown size={14} />
                                </button>
                                {isHubOpen && (
                                    <>
                                        <div style={{ position: 'fixed', inset: 0, zIndex: 150 }} onClick={() => setIsHubOpen(false)}></div>
                                        <div style={{ position: 'absolute', top: '110%', right: 0, minWidth: '200px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', zIndex: 200, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '14px' }} onClick={() => { handleBranchChange('', 'All Branches'); setIsHubOpen(false); }}>All Branches</div>
                                            {branches.map(b => (
                                                <div key={b.id} style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '14px' }} onClick={() => { handleBranchChange(b.id, b.name); setIsHubOpen(false); }}>{b.name}</div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Notification Bell */}
                        <div ref={bellRef} style={{ position: 'relative' }}>
                            <button
                                className="notification-bell"
                                onClick={() => { setBellOpen(!bellOpen); if (!bellOpen) markAllRead(); }}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                                )}
                            </button>

                            {bellOpen && (
                                <div className="notification-panel">
                                    <div className="notification-panel-header">
                                        <h4 style={{ margin: 0 }}>Notifications</h4>
                                        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setBellOpen(false)}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="notification-list">
                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                                                <Bell size={32} style={{ opacity: 0.15, marginBottom: '12px' }} />
                                                <p>No notifications yet</p>
                                            </div>
                                        ) : (
                                            <>
                                                {notifications.map(n => (
                                                    <div
                                                        key={n.id}
                                                        className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                                                        onClick={() => {
                                                            if (n.type === 'new_order') navigate('/admin/orders');
                                                            else if (n.type === 'support_request') navigate('/admin/support');
                                                            setBellOpen(false);
                                                        }}
                                                    >
                                                        <span className="notification-icon">{getNotificationIcon(n.type)}</span>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{n.title}</div>
                                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>
                                                        </div>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{timeAgo(n.createdAt)}</span>
                                                    </div>
                                                ))}
                                                <div
                                                    style={{
                                                        padding: '12px',
                                                        textAlign: 'center',
                                                        borderTop: '1px solid var(--border-color)',
                                                        background: 'var(--bg-light)',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: 'var(--accent)'
                                                    }}
                                                    onClick={() => { navigate('/admin/notifications'); setBellOpen(false); }}
                                                >
                                                    View All Notifications
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button className="btn-new-order" onClick={() => navigate('/admin/orders')}>+ New Order</button>
                        <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                            {localStorage.getItem('adminName')?.charAt(0) || 'A'}
                        </div>
                    </div>
                </header>

                {/* Toast Notification */}
                {toast && (
                    <div className="notification-toast">
                        <span style={{ fontSize: '20px' }}>{getNotificationIcon(toast.type)}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{toast.title}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{toast.body}</div>
                        </div>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setToast(null)}>
                            <X size={16} />
                        </button>
                    </div>
                )}

                <main className="dashboard-page">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
