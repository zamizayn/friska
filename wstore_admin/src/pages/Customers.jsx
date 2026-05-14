import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Users, CheckSquare, Square, MessageSquare, History, ShoppingBag, X, User, Search, Clock } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [selectedPhones, setSelectedPhones] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyOrders, setHistoryOrders] = useState([]);
    const [historyPagination, setHistoryPagination] = useState({ page: 1, totalPages: 1 });
    const [logsOpen, setLogsOpen] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);
    const [logsPagination, setLogsPagination] = useState({ page: 1, totalPages: 1 });
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [activeCustomer, setActiveCustomer] = useState(null);
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [sending, setSending] = useState(false);
    const navigate = useNavigate();

    const fetchCustomers = async (page = 1) => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        const res = await fetch(`${API_ENDPOINTS.CUSTOMERS}?page=${page}&limit=10&branchId=${branchId}`, {
            headers: getHeaders()
        });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setCustomers(result.data);
        setPagination({ page: result.page, totalPages: result.totalPages });
    };

    const fetchHistory = async (customer, page = 1) => {
        const res = await fetch(`${API_ENDPOINTS.CUSTOMERS}/${customer.phone}/orders?page=${page}&limit=10`, {
            headers: getHeaders()
        });
        const result = await res.json();
        setHistoryOrders(result.data);
        setHistoryPagination({ page: result.page, totalPages: result.totalPages });
        setActiveCustomer(customer);
        setHistoryOpen(true);
    };

    const fetchLogs = async (customer, page = 1) => {
        if (loadingLogs) return;
        setLoadingLogs(true);
        try {
            const res = await fetch(`${API_ENDPOINTS.CUSTOMERS}/${customer.phone}/logs?page=${page}&limit=20`, {
                headers: getHeaders()
            });
            const result = await res.json();

            if (page === 1) {
                setActivityLogs(result.data || []);
            } else {
                setActivityLogs(prev => [...prev, ...(result.data || [])]);
            }

            setLogsPagination({ page: result.page, totalPages: result.totalPages });
            setActiveCustomer(customer);
            setLogsOpen(true);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleLogsScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50) { // 50px threshold
            if (logsPagination.page < logsPagination.totalPages && !loadingLogs) {
                fetchLogs(activeCustomer, logsPagination.page + 1);
            }
        }
    };

    useEffect(() => { fetchCustomers(); }, []);

    const formatLogDetails = (log) => {
        const { details, actionType } = log;
        if (!details) return '';

        switch (actionType) {
            case 'CATEGORY_VIEWED':
                return <span>Viewing Category: <strong>{details.categoryName || `ID: ${details.categoryId}`}</strong></span>;
            case 'PRODUCT_VIEWED':
                return <span>Viewing Product: <strong>{details.productName || `ID: ${details.productId}`}</strong></span>;
            case 'ADDED_TO_CART':
                return <span>Added to Cart: <strong>{details.productName || `ID: ${details.productId}`}</strong></span>;
            case 'CHECKOUT':
                return details.type === 'native_order' ? 'Started Native WhatsApp Checkout' : 'Initiated Checkout';
            case 'SEARCHED':
                return <span>Searched for: "<strong>{details.query}</strong>"</span>;
            case 'MENU_VIEWED':
                return 'Opened Main Menu';
            case 'SHOP_VIEWED':
                return 'Opened Category List';
            case 'SUPPORT_REQUEST':
                return <span>Support Message: <strong>{details.message}</strong></span>;
            default:
                return JSON.stringify(details) === '{}' ? 'No extra details' : JSON.stringify(details);
        }
    };

    const toggleSelect = (phone) => {
        if (selectedPhones.includes(phone)) {
            setSelectedPhones(selectedPhones.filter(p => p !== phone));
        } else {
            setSelectedPhones([...selectedPhones, phone]);
        }
    };

    const toggleAll = () => {
        if (selectedPhones.length === customers.length) {
            setSelectedPhones([]);
        } else {
            setSelectedPhones(customers.map(c => c.phone));
        }
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (selectedPhones.length === 0) return alert('Select at least one customer');
        setSending(true);

        try {
            const res = await fetch(API_ENDPOINTS.BROADCAST, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ phones: selectedPhones, message: broadcastMsg })
            });
            const result = await res.json();
            alert(`Sent to ${result.successCount} customers. Failed for ${result.failCount}.`);
            setModalOpen(false);
            setBroadcastMsg('');
            setSelectedPhones([]);
        } catch (e) {
            alert('Broadcast failed');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Customers</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Audience insights and relationship management</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-outline" onClick={toggleAll}>
                        {selectedPhones.length === customers.length ? <CheckSquare size={18} /> : <Square size={18} />}
                        {selectedPhones.length === customers.length ? 'Deselect All' : 'Select All Page'}
                    </button>
                    <button
                        className="btn-primary"
                        disabled={selectedPhones.length === 0}
                        onClick={() => setModalOpen(true)}
                    >
                        <Send size={18} /> Broadcast ({selectedPhones.length})
                    </button>
                </div>
            </header>

            <div className="white-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>Customer Info</th>
                            <th>Last Active</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(cust => (
                            <tr key={cust.id} onClick={() => toggleSelect(cust.phone)} style={{ cursor: 'pointer' }}>
                                <td>
                                    {selectedPhones.includes(cust.phone) ? <CheckSquare size={20} className="text-accent" /> : <Square size={20} style={{ color: 'var(--border-hover)' }} />}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-app)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 800 }}>
                                            {cust.name ? cust.name[0].toUpperCase() : 'A'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '15px' }}>{cust.name || 'Anonymous User'}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>+{cust.phone}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                        <Clock size={14} />
                                        {new Date(cust.lastInteraction).toLocaleString()}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button className="btn-outline" style={{ padding: '8px' }} onClick={(e) => { e.stopPropagation(); setSelectedPhones([cust.phone]); setModalOpen(true); }} title="Send Message">
                                            <MessageSquare size={16} />
                                        </button>
                                        <button className="btn-outline" style={{ padding: '8px' }} onClick={(e) => { e.stopPropagation(); fetchLogs(cust); }} title="Activity Logs">
                                            <History size={16} />
                                        </button>
                                        <button className="btn-outline" style={{ padding: '8px' }} onClick={(e) => { e.stopPropagation(); fetchHistory(cust); }} title="Order History">
                                            <ShoppingBag size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {customers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                        <Users size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                        <p>No customers found in your database.</p>
                    </div>
                )}

                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={(page) => fetchCustomers(page)}
                    />
                </div>
            </div>

            {/* Broadcast Modal */}
            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '500px', padding: '32px' }}>
                        <h3>{selectedPhones.length === 1 ? 'Send Message' : 'Send Broadcast Message'}</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '12px 0 24px' }}>
                            Your message will be sent to {selectedPhones.length === 1 ? 'this customer' : `${selectedPhones.length} customers`} via WhatsApp.
                        </p>
                        <form onSubmit={handleBroadcast}>
                            <div className="input-group">
                                <label>Message Content</label>
                                <textarea
                                    rows="6"
                                    placeholder="Write your update or promotional message..."
                                    value={broadcastMsg}
                                    onChange={e => setBroadcastMsg(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="modal-actions" style={{ gap: '12px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={sending}>
                                    {sending ? 'Sending...' : 'Send Message Now'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Activity Logs Modal */}
            {logsOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '600px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h3 style={{ marginBottom: '4px' }}>Activity Timeline</h3>
                                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Tracking for {activeCustomer?.phone}</p>
                            </div>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => { setLogsOpen(false); setActivityLogs([]); setLogsPagination({ page: 1, totalPages: 1 }); }}>✕</button>
                        </div>
                        <div
                            onScroll={handleLogsScroll}
                            style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '8px' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {activityLogs.map((log, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{ width: '12px', height: '12px', background: 'var(--accent)', borderRadius: '50%', border: '2px solid white', boxShadow: '0 0 0 2px var(--accent-light)' }}></div>
                                            {i !== activityLogs.length - 1 && <div style={{ flex: 1, width: '2px', background: 'var(--border-color)', margin: '4px 0' }}></div>}
                                        </div>
                                        <div style={{ paddingBottom: '24px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{log.actionType.replace(/_/g, ' ')}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{formatLogDetails(log)}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{new Date(log.createdAt).toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                                {activityLogs.length === 0 && !loadingLogs && <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No logs recorded for this customer.</p>}
                                {loadingLogs && <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>Loading more logs...</p>}
                            </div>
                        </div>

                        <div style={{ marginTop: '32px' }}>
                            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setLogsOpen(false); setActivityLogs([]); setLogsPagination({ page: 1, totalPages: 1 }); }}>Close Timeline</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order History Modal */}
            {historyOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '800px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3>Order History: {activeCustomer?.phone}</h3>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setHistoryOpen(false)}>✕</button>
                        </div>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Date</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyOrders.map(order => (
                                    <tr key={order.id}>
                                        <td style={{ fontWeight: 700 }}>#{order.id}</td>
                                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 700 }}>₹{order.total}</td>
                                        <td>
                                            <span className={`status-pill ${order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'danger' : 'warning'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {historyOrders.length === 0 && <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No previous orders found.</p>}

                        {historyPagination.totalPages > 1 && (
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                                <Pagination
                                    currentPage={historyPagination.page}
                                    totalPages={historyPagination.totalPages}
                                    onPageChange={(page) => fetchHistory(activeCustomer, page)}
                                />
                            </div>
                        )}

                        <div style={{ marginTop: '32px' }}>
                            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setHistoryOpen(false)}>Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
