import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, Users, TrendingUp, IndianRupee, Star, Clock, CheckCircle, Truck, AlertCircle, PieChart as PieIcon, BarChart as BarIcon, Save, Key, Phone, Settings2, Search, Heart, MousePointer2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, ComposedChart, Line } from 'recharts';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#38bdf8', '#8b5cf6'];

export default function Dashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [tenant, setTenant] = useState(null);
    const [stats, setStats] = useState({ categories: 0, products: 0 });
    const [configForm, setConfigForm] = useState({ wabaId: '', phoneNumberId: '', whatsappToken: '', displayMode: 'catalog' });
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const navigate = useNavigate();

    const fetchDashboardData = async () => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        const branchParam = branchId ? `&branchId=${branchId}` : '';
        try {
            const [counts, anaRes] = await Promise.all([
                fetch(`${API_ENDPOINTS.ANALYTICS}?${branchParam.replace('&', '')}`, { headers: getHeaders() }),
                fetch(`${API_ENDPOINTS.CATEGORIES}?${branchParam.replace('&', '')}`, { headers: getHeaders() })
            ]);

            if (counts.status === 401) return navigate('/login');

            const anaData = await counts.json();
            const catData = await anaRes.json();

            setAnalytics(anaData);
            setStats({
                categories: catData.total || catData.length,
                products: anaData.totalProducts || 0
            });

            const prodRes = await fetch(`${API_ENDPOINTS.PRODUCTS}?limit=1${branchParam}`, { headers: getHeaders() });
            const prodData = await prodRes.json();
            setStats(prev => ({ ...prev, products: prodData.total }));

            if (localStorage.getItem('adminRole') !== 'superadmin') {
                const tRes = await fetch(`${API_ENDPOINTS.TENANTS}/me`, { headers: getHeaders() });
                if (tRes.ok) {
                    const tData = await tRes.json();
                    setTenant(tData);
                    setConfigForm({
                        wabaId: tData.wabaId || '',
                        phoneNumberId: tData.phoneNumberId || '',
                        whatsappToken: tData.whatsappToken || '',
                        displayMode: tData.displayMode || 'catalog'
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateConfig = async (e) => {
        e.preventDefault();
        setIsUpdatingConfig(true);
        try {
            const tId = tenant?.id;
            const res = await fetch(`${API_ENDPOINTS.TENANTS}/${tId}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(configForm)
            });
            if (res.ok) {
                alert('WhatsApp configuration updated successfully!');
                const updated = await res.json();
                setTenant(updated);
            } else {
                const err = await res.json();
                alert('Error: ' + (err.error || 'Failed to update configuration'));
            }
        } catch (err) {
            alert('Error updating configuration.');
        } finally {
            setIsUpdatingConfig(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const formatActivity = (log) => {
        const { details, actionType } = log;
        switch (actionType) {
            case 'PRODUCT_VIEWED':
                return { icon: MousePointer2, text: `Viewed product: ${details.productName || 'Unknown'}`, color: '#6366f1' };
            case 'SEARCHED':
                return { icon: Search, text: `Searched for: "${details.query}"`, color: '#f59e0b' };
            case 'ADDED_TO_CART':
                return { icon: ShoppingBag, text: `Added to cart: ${details.productName || 'Unknown'}`, color: '#10b981' };
            case 'CHECKOUT':
                return { icon: ShoppingCart, text: `Started checkout process`, color: '#ef4444' };
            case 'CATEGORY_VIEWED':
                return { icon: BarIcon, text: `Browsed category: ${details.categoryName || 'Unknown'}`, color: '#38bdf8' };
            case 'SUPPORT_REQUEST':
                return { icon: Phone, text: `Asked for support`, color: '#8b5cf6' };
            default:
                return { icon: Clock, text: actionType.replace(/_/g, ' '), color: 'var(--text-muted)' };
        }
    };

    if (!analytics) return <div className="loading-content">Loading Intelligence...</div>;

    return (
        <div className="dashboard-content">
            <section className="hero-banner">
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <p style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    <h1>{getGreeting()}, {localStorage.getItem('adminName')?.split(' ')[0] || 'Admin'}</h1>
                    <p>Here's what's happening with your store today.</p>
                </div>

                <div className="hero-stats-grid">
                    <div className="glass-stat-card">
                        <label><IndianRupee size={14} /> REVENUE</label>
                        <div className="value">₹{analytics.revenue.toLocaleString()}</div>
                        <div className="trend" style={{ color: '#4ade80' }}><TrendingUp size={12} /> Live sales</div>
                    </div>
                    <div className="glass-stat-card">
                        <label><ShoppingCart size={14} /> TOTAL ORDERS</label>
                        <div className="value">{analytics.totalOrders}</div>
                        <div className="trend" style={{ color: '#4ade80' }}><TrendingUp size={12} /> Processed</div>
                    </div>
                    <div className="glass-stat-card">
                        <label><Users size={14} /> ACTIVE CUSTOMERS</label>
                        <div className="value">{analytics.totalCustomers}</div>
                        <div className="trend" style={{ color: '#fbbf24' }}><TrendingUp size={12} /> Interaction</div>
                    </div>
                    <div className="glass-stat-card">
                        <label><Star size={14} /> AVG. ORDER VALUE</label>
                        <div className="value">₹{Math.round(analytics.aov)}</div>
                        <div className="trend" style={{ color: '#4ade80' }}><TrendingUp size={12} /> Ticket size</div>
                    </div>
                </div>
            </section>

            <div className="dashboard-grid">
                <div className="main-stats">
                    {/* Revenue Trend */}
                    <div className="white-card">
                        <div className="card-header">
                            <div>
                                <h3>Revenue Performance</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Daily revenue for the last 7 days</p>
                            </div>
                        </div>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={analytics.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <Tooltip
                                        cursor={{ fill: 'var(--bg-app)', opacity: 0.4 }}
                                        contentStyle={{ background: 'white', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                                        formatter={(val) => [`₹${val}`, 'Revenue']}
                                    />
                                    <Bar dataKey="revenue" fill="var(--accent)" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '32px' }}>
                        {/* Top Products */}
                        <div className="white-card">
                            <div className="card-header">
                                <h3>Top Products</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>By sales volume</p>
                            </div>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={analytics.topProducts} layout="vertical" margin={{ left: -20, right: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} style={{ fontSize: '11px', fontWeight: 600 }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                                        <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        <div className="white-card">
                            <div className="card-header">
                                <h3>Category Share</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>By revenue</p>
                            </div>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={analytics.categoryRevenue}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {analytics.categoryRevenue.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '-20px' }}>
                                    {analytics.categoryRevenue.slice(0, 3).map((cat, i) => (
                                        <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600 }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length] }}></div>
                                            {cat.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Orders */}
                    <div className="white-card" style={{ marginTop: '32px' }}>
                        <div className="card-header">
                            <h3>Recent Orders</h3>
                            <button className="btn-outline" style={{ fontSize: '12px' }} onClick={() => navigate('/admin/orders')}>View All</button>
                        </div>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Customer</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.recentOrders.map(order => (
                                    <tr key={order.id}>
                                        <td style={{ fontWeight: 700 }}>#{order.id}</td>
                                        <td>{order.customerPhone}</td>
                                        <td style={{ fontWeight: 600 }}>₹{order.total}</td>
                                        <td>
                                            <span className={`status-pill ${order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'warning' : 'info'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="side-panels">
                    {/* Live Activity Feed */}
                    <div className="white-card">
                        <div className="card-header">
                            <div>
                                <h3 style={{ fontSize: '16px' }}>Live Activity</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Real-time shopper pulse</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
                            {analytics.recentActivity?.map((log, i) => {
                                const act = formatActivity(log);
                                const Icon = act.icon;
                                return (
                                    <div key={i} style={{ display: 'flex', gap: '14px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${act.color}15`, color: act.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Icon size={16} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.4 }}>{act.text}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>{log.customerPhone}</span>
                                                <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {(!analytics.recentActivity || analytics.recentActivity.length === 0) && (
                                <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', padding: '20px' }}>Waiting for activity...</p>
                            )}
                        </div>
                    </div>

                    <div className="white-card" style={{ marginTop: '32px' }}>
                        <div className="card-header">
                            <h3 style={{ fontSize: '16px' }}>Order Status</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[
                                { label: 'Delivered', count: analytics.statusCounts?.delivered || 0, color: '#10b981', bg: '#dcfce7' },
                                { label: 'Shipped', count: analytics.statusCounts?.shipped || 0, color: '#6366f1', bg: '#e0e7ff' },
                                { label: 'Pending', count: analytics.statusCounts?.pending || 0, color: '#f59e0b', bg: '#fef9c3' },
                                { label: 'Cancelled', count: analytics.statusCounts?.cancelled || 0, color: '#ef4444', bg: '#fee2e2' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '40px', height: '40px', background: item.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: item.color }}>{item.count}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.label}</div>
                                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: item.color, borderRadius: '3px', width: `${analytics.totalOrders > 0 ? Math.round((item.count / analytics.totalOrders) * 100) : 0}%`, transition: 'width 0.5s ease' }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="white-card" style={{ marginTop: '32px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '20px' }}>Quick Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[
                                { label: 'Create Order', icon: ShoppingCart, path: '/admin/orders', color: '#6366f1' },
                                { label: 'Add Product', icon: ShoppingBag, path: '/admin/products', color: '#10b981' },
                                { label: 'View Customers', icon: Users, path: '/admin/customers', color: '#f59e0b' },
                                { label: 'Check Inventory', icon: AlertCircle, path: '/admin/inventory', color: '#ef4444' },
                            ].map(action => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.label}
                                        onClick={() => navigate(action.path)}
                                        className="btn-action-card"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '14px',
                                            padding: '14px 16px', borderRadius: '14px',
                                            background: 'var(--bg-app)', border: '1px solid var(--border-color)',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', width: '100%', textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${action.color}15`, color: action.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icon size={18} />
                                        </div>
                                        {action.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock Alerts */}
            {analytics.lowStock && analytics.lowStock.length > 0 && (
                <div className="white-card" style={{ marginTop: '32px' }}>
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', background: '#fef2f2', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h3>Inventory Warnings</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{analytics.lowStock.length} items running low</p>
                            </div>
                        </div>
                        <button className="btn-outline" style={{ fontSize: '12px' }} onClick={() => navigate('/admin/inventory')}>Manage Stock</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {analytics.lowStock.slice(0, 8).map(item => (
                            <div key={item.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 16px', background: 'var(--bg-app)', borderRadius: '12px',
                                border: `1px solid ${item.stock === 0 ? '#fee2e2' : 'var(--border-color)'}`
                            }}>
                                <span style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{item.name}</span>
                                <span style={{
                                    fontWeight: 800, fontSize: '13px',
                                    color: item.stock === 0 ? '#ef4444' : '#f59e0b',
                                    background: item.stock === 0 ? '#fef2f2' : '#fefce8',
                                    padding: '4px 10px', borderRadius: '8px'
                                }}>{item.stock === 0 ? 'OUT' : item.stock}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* WhatsApp Configuration & Status - Tenant/Branch only */}
            {tenant && localStorage.getItem('adminRole') !== 'superadmin' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px', marginTop: '32px' }}>
                    {/* Column 1: Config Form */}
                    <div className="white-card">
                        <div className="card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: '#dcfce7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <h3>WhatsApp & Meta Integration</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Credentials for WhatsApp Commerce</p>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleUpdateConfig}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className="input-group">
                                    <label>WABA ID</label>
                                    <input
                                        type="text"
                                        placeholder="WhatsApp Business Account ID"
                                        value={configForm.wabaId}
                                        onChange={e => setConfigForm({ ...configForm, wabaId: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Phone Number ID</label>
                                    <input
                                        type="text"
                                        placeholder="Meta Phone Number ID"
                                        value={configForm.phoneNumberId}
                                        onChange={e => setConfigForm({ ...configForm, phoneNumberId: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Access Token</label>
                                    <input
                                        type="password"
                                        placeholder="Meta permanent access token"
                                        value={configForm.whatsappToken}
                                        onChange={e => setConfigForm({ ...configForm, whatsappToken: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn-primary" disabled={isUpdatingConfig}>
                                    <Save size={16} /> {isUpdatingConfig ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Column 2: Operational Health */}
                    <div className="white-card">
                        <div className="card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: '#e0e7ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                                    <Settings2 size={20} />
                                </div>
                                <div>
                                    <h3>Operational Status</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>System health and quick settings</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-app)', borderRadius: '16px' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>Meta Webhooks</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Required for incoming messages</div>
                                </div>
                                <span className={`status-pill ${analytics.webhooksEnabled ? 'success' : 'warning'}`}>
                                    {analytics.webhooksEnabled ? 'Connected' : 'Action Required'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-app)', borderRadius: '16px' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>Customer Support</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Pending help requests</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '14px', color: analytics.pendingSupport > 0 ? '#ef4444' : 'var(--text-muted)' }}>{analytics.pendingSupport}</span>
                                    <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/admin/support')}>View</button>
                                </div>
                            </div>

                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Store Display Mode</label>
                                <select
                                    value={configForm.displayMode}
                                    onChange={e => {
                                        const newVal = e.target.value;
                                        setConfigForm(prev => ({ ...prev, displayMode: newVal }));
                                        // Auto-save display mode for convenience
                                        fetch(`${API_ENDPOINTS.TENANTS}/${tenant.id}`, {
                                            method: 'PUT',
                                            headers: getHeaders(),
                                            body: JSON.stringify({ displayMode: newVal })
                                        });
                                    }}
                                    style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '12px' }}
                                >
                                    <option value="catalog">Catalog (Native WhatsApp)</option>
                                    <option value="list">List (Interactive Messages)</option>
                                </select>
                            </div>

                            <div style={{ padding: '16px', border: '1px dashed var(--border-color)', borderRadius: '16px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                <span>Always ensure your <strong>Access Token</strong> is permanent to avoid delivery interruptions.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
