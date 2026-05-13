import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy, MessageSquare, History, ShoppingBag, X, User, Phone, Calendar, ShoppingCart, Send, CheckCircle, Filter, Play, Pause, Volume2, Music } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Support() {
    const [requests, setRequests] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [activeRequest, setActiveRequest] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyOrders, setHistoryOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);
    const navigate = useNavigate();

    const fetchSupportRequests = async (page = 1, filterUnread = unreadOnly, date = selectedDate) => {
        setLoading(true);
        const branchId = localStorage.getItem('selectedBranchId') || '';
        try {
            const url = `${API_ENDPOINTS.SUPPORT_REQUESTS}?page=${page}&limit=10&branchId=${branchId}&unreadOnly=${filterUnread}&date=${date}`;
            const res = await fetch(url, {
                headers: getHeaders()
            });
            if (res.status === 401) return navigate('/login');
            const result = await res.json();
            setRequests(result.data || []);
            setPagination({ page: result.page, totalPages: result.totalPages });
        } catch (e) {
            console.error('Failed to fetch support requests:', e);
        } finally {
            setLoading(false);
        }
    };

    const toggleFilter = () => {
        const newVal = !unreadOnly;
        setUnreadOnly(newVal);
        fetchSupportRequests(1, newVal, selectedDate);
    };

    const handleDateChange = (val) => {
        setSelectedDate(val);
        fetchSupportRequests(1, unreadOnly, val);
    };

    useEffect(() => {
        fetchSupportRequests();
    }, []);

    const fetchHistory = async (phone) => {
        const res = await fetch(`${API_ENDPOINTS.CUSTOMERS}/${phone}/orders`, {
            headers: getHeaders()
        });
        const data = await res.json();
        setHistoryOrders(data);
        setHistoryOpen(true);
    };

    const fetchSpecificOrder = async (orderId) => {
        try {
            const res = await fetch(`${API_ENDPOINTS.ORDERS}/${orderId}`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Order not found');
            const data = await res.json();
            setHistoryOrders([data]);
            setHistoryOpen(true);
        } catch (e) {
            console.error('Failed to fetch specific order:', e);
            alert('Could not load order details.');
        }
    };

    const sendReply = async () => {
        if (!replyText.trim()) return alert('Please enter a message');
        setIsSendingReply(true);
        try {
            const res = await fetch(`${API_ENDPOINTS.SUPPORT_REQUESTS}/${activeRequest.id}/reply`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ replyMessage: replyText })
            });
            if (res.ok) {
                alert('Reply sent successfully!');
                setReplyModalOpen(false);
                setReplyText('');
                fetchSupportRequests(pagination.page);
            } else {
                const err = await res.json();
                alert('Failed to send: ' + (err.error || 'Unknown error'));
            }
        } catch (e) {
            console.error('Reply error:', e);
            alert('Error sending reply.');
        } finally {
            setIsSendingReply(false);
        }
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Support Desk</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Resolve customer queries and support requests</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '4px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <Calendar size={16} color="var(--text-muted)" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            style={{ border: 'none', outline: 'none', fontSize: '13px', color: 'var(--text-main)', padding: '6px 0' }}
                        />
                    </div>
                    <button
                        onClick={toggleFilter}
                        className={`btn-outline ${unreadOnly ? 'active' : ''}`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: unreadOnly ? 'var(--accent)' : 'white',
                            color: unreadOnly ? 'white' : 'var(--text-main)',
                            borderColor: unreadOnly ? 'var(--accent)' : 'var(--border-color)'
                        }}
                    >
                        <Filter size={18} />
                        {unreadOnly ? 'Unread Only' : 'All Messages'}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--success)', color: 'white', padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600 }}>
                        <CheckCircle size={18} />
                        System Online
                    </div>
                </div>
            </header>

            <div className="white-card">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Loading requests...</div>
                ) : (
                    <>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Context</th>
                                    <th>Inquiry Message</th>
                                    <th>Received</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', background: 'var(--bg-app)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 800 }}>
                                                    {req.customer?.name ? req.customer.name[0].toUpperCase() : 'A'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{req.customer?.name || 'Anonymous'}</div>
                                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>+{req.customerPhone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {req.details?.orderId ? (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent-light)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
                                                    <ShoppingCart size={12} /> ORDER #{req.details.orderId}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>General Help</span>
                                            )}
                                        </td>
                                        <td style={{ maxWidth: '350px' }}>
                                            <div style={{ background: 'var(--bg-app)', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', borderLeft: '3px solid var(--accent)' }}>
                                                {req.details?.message}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px' }}>
                                                <div style={{ fontWeight: 600 }}>{new Date(req.createdAt).toLocaleDateString()}</div>
                                                <div style={{ color: 'var(--text-muted)' }}>{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => { setActiveRequest(req); setReplyModalOpen(true); }}>
                                                    <MessageSquare size={16} /> Reply
                                                </button>
                                                <button className="btn-outline" style={{ padding: '8px' }} onClick={() => { setActiveRequest(req); req.details?.orderId ? fetchSpecificOrder(req.details.orderId) : fetchHistory(req.customerPhone); }}>
                                                    <ShoppingBag size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {requests.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                                <LifeBuoy size={64} style={{ opacity: 0.1, marginBottom: '24px' }} />
                                <h3>{unreadOnly ? 'No unread messages!' : 'All caught up!'}</h3>
                                <p>{unreadOnly ? 'You have replied to all support requests.' : 'No pending support requests at the moment.'}</p>
                            </div>
                        )}

                        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
                            <Pagination
                                currentPage={pagination.page}
                                totalPages={pagination.totalPages}
                                onPageChange={(page) => fetchSupportRequests(page)}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Reply Modal */}
            {replyModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '500px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3>Reply to Support Request</h3>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setReplyModalOpen(false)}>✕</button>
                        </div>
                        <div style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase' }}>Customer's Message</p>
                            <p style={{ fontSize: '14px', color: 'var(--text-main)' }}>"{activeRequest?.details?.message}"</p>
                            {activeRequest?.details?.message?.includes('[Audio Message]') && (
                                <AudioPlayer
                                    mediaId={activeRequest.details.message.split('(ID: ')[1]?.split(')')[0]}
                                />
                            )}
                        </div>
                        <div className="input-group">
                            <label>Your Response</label>
                            <textarea
                                rows="5"
                                placeholder="Type your reply here..."
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions" style={{ gap: '12px' }}>
                            <button className="btn-outline" style={{ flex: 1 }} onClick={() => setReplyModalOpen(false)}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={sendReply} disabled={isSendingReply}>
                                {isSendingReply ? 'Sending...' : 'Send WhatsApp Reply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order/History Modal */}
            {historyOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '700px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3>Reference Details</h3>
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
                                            <span className={`status-pill ${order.status === 'delivered' ? 'success' : 'warning'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ marginTop: '32px' }}>
                            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setHistoryOpen(false)}>Close Reference</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AudioPlayer({ mediaId }) {
    const [audioUrl, setAudioUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadAudio = async () => {
        if (audioUrl) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_ENDPOINTS.SUPPORT_REQUESTS}/media/${mediaId}`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Could not fetch audio');
            const blob = await res.blob();
            // Force OGG type as WhatsApp voice notes are OGG/Opus
            const audioBlob = new Blob([blob], { type: 'audio/ogg' });
            setAudioUrl(URL.createObjectURL(audioBlob));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (error) return <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '8px' }}>⚠️ {error}</div>;

    if (!audioUrl) {
        return (
            <button
                className="btn-outline"
                style={{ marginTop: '12px', padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}
                onClick={loadAudio}
                disabled={loading}
            >
                {loading ? 'Initializing...' : '🔊 Listen to Voice Note'}
            </button>
        );
    }

    return (
        <div style={{
            marginTop: '16px',
            background: 'white',
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            maxWidth: '100%'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>VOICE NOTE</span>
            </div>
            <audio
                controls
                src={audioUrl}
                style={{ width: '100%', height: '36px' }}
                autoPlay
            >
                Your browser does not support audio.
            </audio>
        </div>
    );
}
