import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Filter, Calendar, ChevronRight, CheckCircle2, ShoppingCart, LifeBuoy, AlertTriangle, ArrowLeft, MoreVertical } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';
import Pagination from '../components/Pagination';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, unreadCount: 0 });
    const navigate = useNavigate();

    const fetchNotifications = async (page = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}?page=${page}&limit=10`, {
                headers: getHeaders()
            });
            if (res.status === 401) return navigate('/login');
            const result = await res.json();
            setNotifications(result.notifications || []);
            setPagination({ 
                page: result.page, 
                totalPages: result.totalPages, 
                total: result.total, 
                unreadCount: result.unreadCount 
            });
        } catch (e) {
            console.error('Failed to fetch notifications:', e);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async () => {
        try {
            await fetch(API_ENDPOINTS.NOTIFICATIONS_READ, {
                method: 'PUT',
                headers: getHeaders()
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setPagination(prev => ({ ...prev, unreadCount: 0 }));
        } catch (e) { /* ignore */ }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const getNotificationStyle = (type) => {
        switch(type) {
            case 'new_order': return { icon: <ShoppingCart size={20} />, color: '#3b82f6', bg: '#eff6ff', label: 'Order' };
            case 'support_request': return { icon: <LifeBuoy size={20} />, color: '#ef4444', bg: '#fef2f2', label: 'Support' };
            case 'low_stock': return { icon: <AlertTriangle size={20} />, color: '#f59e0b', bg: '#fffbeb', label: 'Inventory' };
            default: return { icon: <Bell size={20} />, color: '#6366f1', bg: '#f5f3ff', label: 'System' };
        }
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

    const handleNotificationClick = (n) => {
        if (n.type === 'new_order') navigate('/admin/orders');
        else if (n.type === 'support_request') navigate('/admin/support');
    };

    return (
        <div className="notifications-container">
            <div className="notifications-page-header">
                <div className="header-main">
                    <div className="title-section">
                        <h1 className="main-title">Notification History</h1>
                        <p className="sub-title">View and manage all system alerts and updates</p>
                    </div>
                    <div className="header-actions">
                        <button className="mark-read-btn" onClick={markAsRead}>
                            <CheckCircle2 size={16} />
                            <span>Mark all as read</span>
                        </button>
                    </div>
                </div>

                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-info">
                            <span className="stat-label">Total Notifications</span>
                            <span className="stat-value">{pagination.total || 0}</span>
                        </div>
                        <div className="stat-icon"><Bell size={20} /></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-info">
                            <span className="stat-label">Unread Alerts</span>
                            <span className="stat-value unread">{pagination.unreadCount || 0}</span>
                        </div>
                        <div className="stat-icon unread"><AlertTriangle size={20} /></div>
                    </div>
                </div>
            </div>

            <div className="notifications-body">
                {loading ? (
                    <div className="loading-state">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="shimmer-card"></div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-artwork">
                            <div className="circle-bg"></div>
                            <Bell size={64} className="bell-icon" />
                        </div>
                        <h2>All caught up!</h2>
                        <p>No notifications found in your history.</p>
                    </div>
                ) : (
                    <div className="notifications-grid">
                        {notifications.map((n, idx) => {
                            const style = getNotificationStyle(n.type);
                            return (
                                <div 
                                    key={n.id} 
                                    className={`notification-item-card ${!n.isRead ? 'is-unread' : ''}`}
                                    onClick={() => handleNotificationClick(n)}
                                    style={{ '--i': idx }}
                                >
                                    <div className="card-accent" style={{ background: style.color }}></div>
                                    <div className="item-icon-wrap" style={{ background: style.bg, color: style.color }}>
                                        {style.icon}
                                    </div>
                                    <div className="item-content">
                                        <div className="item-header">
                                            <div className="type-badge" style={{ color: style.color, background: `${style.color}15` }}>
                                                {style.label}
                                            </div>
                                            <span className="item-time">{timeAgo(n.createdAt)}</span>
                                        </div>
                                        <h3 className="item-title">{n.title}</h3>
                                        <p className="item-body">{n.body}</p>
                                        <div className="item-meta">
                                            <span className="meta-unit">
                                                <Calendar size={12} />
                                                {new Date(n.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                            {n.data?.branchId && (
                                                <span className="meta-unit branch">
                                                    Branch #{n.data.branchId}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="item-action">
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {pagination.totalPages > 1 && (
                    <div className="notifications-pagination">
                        <Pagination 
                            currentPage={pagination.page} 
                            totalPages={pagination.totalPages} 
                            onPageChange={(page) => fetchNotifications(page)} 
                        />
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .notifications-container {
                    padding: 32px;
                    max-width: 1000px;
                    margin: 0 auto;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                }

                .notifications-page-header {
                    margin-bottom: 40px;
                }

                .header-main {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 32px;
                }

                .main-title {
                    font-size: 32px;
                    font-weight: 850;
                    letter-spacing: -0.03em;
                    color: #0f172a;
                    margin: 0;
                }

                .sub-title {
                    color: #64748b;
                    font-size: 16px;
                    margin: 8px 0 0;
                    font-weight: 500;
                }

                .mark-read-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 20px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    color: #475569;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }

                .mark-read-btn:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }

                .stats-row {
                    display: flex;
                    gap: 20px;
                }

                .stat-card {
                    flex: 1;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 20px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }

                .stat-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .stat-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .stat-value {
                    font-size: 28px;
                    font-weight: 800;
                    color: #0f172a;
                }

                .stat-value.unread {
                    color: var(--accent);
                }

                .stat-icon {
                    width: 44px;
                    height: 44px;
                    background: #f1f5f9;
                    color: #64748b;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .stat-icon.unread {
                    background: rgba(var(--accent-rgb), 0.1);
                    color: var(--accent);
                }

                .notifications-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .notification-item-card {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 24px;
                    display: flex;
                    gap: 24px;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    animation: cardEntrance 0.5s ease-out backwards;
                    animation-delay: calc(var(--i) * 0.06s);
                }

                @keyframes cardEntrance {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .notification-item-card:hover {
                    border-color: #cbd5e1;
                    box-shadow: 0 12px 24px -10px rgba(0,0,0,0.08);
                    transform: translateY(-2px);
                }

                .notification-item-card.is-unread {
                    background: #f8fafc;
                    border-color: rgba(var(--accent-rgb), 0.2);
                }

                .card-accent {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .notification-item-card.is-unread .card-accent {
                    opacity: 1;
                }

                .item-icon-wrap {
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .item-content {
                    flex: 1;
                    min-width: 0;
                }

                .item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .type-badge {
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    padding: 4px 10px;
                    border-radius: 8px;
                    letter-spacing: 0.02em;
                }

                .item-time {
                    font-size: 12px;
                    font-weight: 600;
                    color: #94a3b8;
                }

                .item-title {
                    font-size: 18px;
                    font-weight: 750;
                    color: #1e293b;
                    margin: 0 0 6px;
                    letter-spacing: -0.01em;
                }

                .item-body {
                    font-size: 15px;
                    color: #475569;
                    line-height: 1.6;
                    margin: 0 0 16px;
                }

                .item-meta {
                    display: flex;
                    gap: 16px;
                }

                .meta-unit {
                    font-size: 12px;
                    font-weight: 600;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .meta-unit.branch {
                    background: #f1f5f9;
                    padding: 2px 8px;
                    border-radius: 6px;
                }

                .item-action {
                    display: flex;
                    align-items: center;
                    color: #cbd5e1;
                    transition: all 0.2s;
                }

                .notification-item-card:hover .item-action {
                    color: var(--accent);
                    transform: translateX(4px);
                }

                .empty-state {
                    padding: 100px 40px;
                    text-align: center;
                }

                .empty-artwork {
                    position: relative;
                    width: 120px;
                    height: 120px;
                    margin: 0 auto 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .circle-bg {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: #f1f5f9;
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.05); opacity: 0.4; }
                    100% { transform: scale(0.95); opacity: 0.8; }
                }

                .bell-icon {
                    color: #cbd5e1;
                    z-index: 1;
                }

                .empty-state h2 {
                    font-size: 24px;
                    font-weight: 800;
                    margin: 0 0 12px;
                    color: #1e293b;
                }

                .empty-state p {
                    color: #64748b;
                    font-size: 16px;
                    margin: 0;
                }

                .notifications-pagination {
                    margin-top: 48px;
                    display: flex;
                    justify-content: center;
                }

                .shimmer-card {
                    height: 140px;
                    background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: 20px;
                    margin-bottom: 16px;
                }

                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}} />
        </div>
    );
}


