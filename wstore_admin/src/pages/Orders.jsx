import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageOpen, Plus, User, MapPin, Trash2, IndianRupee, Copy, Check, Eye, Search, Filter, Calendar, Clock, X, CheckCircle, Wallet, CreditCard, TrendingUp, RotateCcw } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [summary, setSummary] = useState({ completed: 0, pending: 0, collected: 0, pendingCollection: 0 });
    const [copiedId, setCopiedId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');
    const [viewingOrder, setViewingOrder] = useState(null);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [orderToCancel, setOrderToCancel] = useState(null);
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        customerPhone: '',
        customerName: '',
        address: '',
        items: [],
        status: 'pending',
        paymentMethod: 'Cash on Delivery'
    });

    const initialFilters = {
        status: '',
        search: '',
        startDate: '',
        endDate: ''
    };
    const [filters, setFilters] = useState(initialFilters);
    const navigate = useNavigate();

    const fetchOrders = async (page = 1) => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        let url = `${API_ENDPOINTS.ORDERS}?page=${page}&limit=10&branchId=${branchId}`;

        if (filters.status) url += `&status=${filters.status}`;
        if (filters.search) url += `&search=${filters.search}`;
        if (filters.startDate) url += `&startDate=${filters.startDate}`;
        if (filters.endDate) url += `&endDate=${filters.endDate}`;

        const res = await fetch(url, {
            headers: getHeaders()
        });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setOrders(result.data || []);
        setPagination({ page: result.page, totalPages: result.totalPages });
        if (result.summary) setSummary(result.summary);
    };

    const fetchProducts = async () => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        const res = await fetch(`${API_ENDPOINTS.PRODUCTS_BASIC}?branchId=${branchId}`, {
            headers: getHeaders()
        });
        const result = await res.json();
        setProducts(result || []);
    };

    useEffect(() => {
        fetchOrders();
        fetchProducts();
    }, [filters]);

    const handlePageChange = (newPage) => {
        fetchOrders(newPage);
    };

    const clearFilters = () => {
        setFilters(initialFilters);
    };

    const updateStatus = async (id, newStatus) => {
        if (newStatus === 'cancelled') {
            setOrderToCancel(id);
            setCancelModalOpen(true);
            return;
        }

        await fetch(`${API_ENDPOINTS.ORDERS}/${id}/status`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        fetchOrders(pagination.page);
    };

    const updatePaymentStatus = async (id, newPaymentStatus) => {
        await fetch(`${API_ENDPOINTS.ORDERS}/${id}/payment-status`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ paymentStatus: newPaymentStatus })
        });
        fetchOrders(pagination.page);
        if (viewingOrder && viewingOrder.id === id) {
            setViewingOrder({ ...viewingOrder, paymentStatus: newPaymentStatus });
        }
    };

    const confirmCancellation = async () => {
        if (!cancellationReason) return alert('Please enter a reason');

        await fetch(`${API_ENDPOINTS.ORDERS}/${orderToCancel}/status`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ status: 'cancelled', cancellationReason })
        });

        setCancelModalOpen(false);
        setCancellationReason('');
        setOrderToCancel(null);
        fetchOrders(pagination.page);
    };

    const addItem = (productId) => {
        const prod = products.find(p => p.id === parseInt(productId));
        if (!prod) return;

        const existing = formData.items.find(item => item.id === prod.id);
        if (existing) {
            setFormData({
                ...formData,
                items: formData.items.map(item => item.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item)
            });
        } else {
            setFormData({
                ...formData,
                items: [...formData.items, {
                    id: prod.id,
                    name: prod.name,
                    price: prod.price,
                    quantity: 1,
                    categoryName: prod.category?.name || 'Uncategorized'
                }]
            });
        }
    };

    const updateQty = (id, delta) => {
        setFormData({
            ...formData,
            items: formData.items.map(item => {
                if (item.id === id) {
                    const newQty = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQty };
                }
                return item;
            })
        });
    };

    const removeItem = (id) => {
        setFormData({
            ...formData,
            items: formData.items.filter(item => item.id !== id)
        });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.items.length === 0) return alert('Please add at least one product');

        const total = calculateTotal();
        await fetch(API_ENDPOINTS.ORDERS, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ...formData, total })
        });

        setModalOpen(false);
        setFormData({ customerPhone: '', customerName: '', address: '', items: [], status: 'pending', paymentMethod: 'Cash on Delivery' });
        fetchOrders();
    };

    const copyToClipboard = (text, id) => {
        const url = text.includes('map: ') ? text.split('map: ')[1].split(' |')[0] : text;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Orders Log</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Track and manage your store's transactions</p>
                </div>
                <button className="btn-primary" onClick={() => setModalOpen(true)}>
                    <Plus size={18} /> Manual Order
                </button>
            </header>

            {/* Summary Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="white-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#dcfce7', color: '#10b981', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Completed Orders</p>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>{summary.completed}</h2>
                    </div>
                </div>

                <div className="white-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#fef3c7', color: '#f59e0b', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Orders</p>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>{summary.pending}</h2>
                    </div>
                </div>

                <div className="white-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#e0e7ff', color: '#6366f1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Collected Amount</p>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>₹{summary.collected.toLocaleString()}</h2>
                    </div>
                </div>

                <div className="white-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#fee2e2', color: '#ef4444', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Collection</p>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>₹{summary.pendingCollection.toLocaleString()}</h2>
                    </div>
                </div>
            </div>

            <div className="white-card" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Status</label>
                        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Search</label>
                        <div className="input-with-icon">
                            <Search size={16} className="field-icon" />
                            <input type="text" placeholder="Phone or Order #" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
                        </div>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>From Date</label>
                        <div className="input-with-icon">
                            <Calendar size={16} className="field-icon" />
                            <DatePicker
                                selected={filters.startDate ? new Date(filters.startDate) : null}
                                onChange={date => setFilters({ ...filters, startDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                                placeholderText="Start Date"
                                className="custom-datepicker"
                                dateFormat="yyyy-MM-dd"
                                isClearable
                            />
                        </div>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>To Date</label>
                        <div className="input-with-icon">
                            <Calendar size={16} className="field-icon" />
                            <DatePicker
                                selected={filters.endDate ? new Date(filters.endDate) : null}
                                onChange={date => setFilters({ ...filters, endDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                                placeholderText="End Date"
                                className="custom-datepicker"
                                dateFormat="yyyy-MM-dd"
                                isClearable
                            />
                        </div>
                    </div>
                    <div>
                        <button className="btn-outline" style={{ width: '100%', height: '45px', justifyContent: 'center', color: 'var(--danger)', borderColor: 'var(--danger)', opacity: filters.status || filters.search || filters.startDate || filters.endDate ? 1 : 0.5 }} onClick={clearFilters} disabled={!(filters.status || filters.search || filters.startDate || filters.endDate)}>
                            <RotateCcw size={16} /> Reset
                        </button>
                    </div>
                </div>
            </div>

            <div className="white-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Payment</th>
                            <th>Payment</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td style={{ fontWeight: 700 }}>#{order.id}</td>
                                <td>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{order.customer?.name || 'Guest Customer'}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '2px' }}>{order.customerPhone}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                                </td>
                                <td>{order.items?.length || 0} items</td>
                                <td style={{ fontWeight: 700 }}>₹{order.total}</td>
                                <td>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{order.paymentMethod || 'COD'}</div>
                                    <div style={{ fontSize: '11px', color: order.paymentStatus === 'paid' ? 'var(--success)' : 'var(--text-muted)' }}>
                                        {order.paymentStatus === 'paid' ? '● Paid' : '○ Pending'}
                                    </div>
                                    {order.paymentTransactionId && (
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>
                                            ID: {order.paymentTransactionId}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <select
                                        className={`status-pill ${order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'warning' : order.status === 'cancelled' ? 'danger' : 'info'}`}
                                        value={order.status}
                                        onChange={(e) => updateStatus(order.id, e.target.value)}
                                        style={{ border: 'none', appearance: 'none', cursor: 'pointer', textAlign: 'center' }}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </td>
                                <td>
                                    <select
                                        className={`status-pill ${order.paymentStatus === 'paid' ? 'success' : 'warning'}`}
                                        value={order.paymentStatus || 'unpaid'}
                                        onChange={(e) => updatePaymentStatus(order.id, e.target.value)}
                                        style={{ border: 'none', appearance: 'none', cursor: 'pointer', textAlign: 'center' }}
                                    >
                                        <option value="unpaid">Unpaid</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn-outline" style={{ padding: '6px' }} onClick={() => { setViewingOrder(order); setViewModalOpen(true); }}>
                                            <Eye size={16} />
                                        </button>
                                        <button className="btn-outline" style={{ padding: '6px' }} onClick={() => { setSelectedAddress(order.address); setAddressModalOpen(true); }}>
                                            <MapPin size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {orders.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                        <PackageOpen size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p>No orders found for the selected criteria.</p>
                    </div>
                )}
                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
                    <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} />
                </div>
            </div>

            {/* Manual Order Modal */}
            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '800px', width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3>Create Manual Order</h3>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                <div>
                                    <div className="input-group">
                                        <label>Customer Phone (WhatsApp)</label>
                                        <input type="text" placeholder="919876543210" value={formData.customerPhone} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Customer Name</label>
                                        <input type="text" placeholder="e.g. John Doe" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Full Address</label>
                                        <textarea style={{ height: '100px' }} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Payment Mode</label>
                                        <select value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}>
                                            <option value="Cash on Delivery">Cash on Delivery</option>
                                            <option value="Online Payment">Online Payment</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Add Product</label>
                                        <select onChange={(e) => { if (e.target.value) addItem(e.target.value); e.target.value = ''; }}>
                                            <option value="">Search Products...</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ marginBottom: '16px' }}>Order Items</h4>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '24px' }}>
                                        {formData.items.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No items added yet.</p>}
                                        {formData.items.map(item => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-app)', borderRadius: '12px', marginBottom: '8px' }}>
                                                <div>
                                                    <p style={{ fontWeight: 600, fontSize: '14px' }}>{item.name}</p>
                                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>₹{item.price} x {item.quantity}</p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button type="button" className="btn-outline" style={{ padding: '2px 8px' }} onClick={() => updateQty(item.id, -1)}>-</button>
                                                        <button type="button" className="btn-outline" style={{ padding: '2px 8px' }} onClick={() => updateQty(item.id, 1)}>+</button>
                                                    </div>
                                                    <button type="button" onClick={() => removeItem(item.id)} style={{ color: 'var(--danger)', background: 'none', border: 'none' }}><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 800 }}>
                                            <span>Total Amount</span>
                                            <span>₹{calculateTotal()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions" style={{ marginTop: '32px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Place Manual Order</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Address View Modal */}
            {addressModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3>Delivery Address</h3>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setAddressModalOpen(false)}>✕</button>
                        </div>
                        <div style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: '16px', fontSize: '14px', lineHeight: 1.6, color: 'var(--text-main)', marginBottom: '24px' }}>
                            {selectedAddress}
                        </div>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => copyToClipboard(selectedAddress, 'addr')}>
                            {copiedId === 'addr' ? <Check size={18} /> : <Copy size={18} />} {copiedId === 'addr' ? 'Copied!' : 'Copy Address'}
                        </button>
                    </div>
                </div>
            )}

            {/* Order Details View Modal */}
            {viewModalOpen && viewingOrder && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '600px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <div>
                                <h3 style={{ marginBottom: '4px' }}>Order Details</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Order ID: #{viewingOrder.id}</p>
                            </div>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setViewModalOpen(false)}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            <div>
                                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Customer Info</h4>
                                <p style={{ fontWeight: 700 }}>{viewingOrder.customerName || 'N/A'}</p>
                                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{viewingOrder.customerPhone}</p>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Payment Details</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span className={`status-pill ${viewingOrder.paymentStatus === 'paid' ? 'success' : 'warning'}`} style={{ alignSelf: 'flex-start' }}>
                                        {viewingOrder.paymentStatus || 'unpaid'}
                                    </span>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                        Mode: <span style={{ color: 'var(--accent)' }}>{viewingOrder.paymentMethod || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Location Details</h4>
                            <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '12px', fontSize: '13px', lineHeight: 1.5, border: '1px solid var(--border-color)' }}>
                                {viewingOrder.address}
                            </div>
                        </div>

                        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Ordered Items</h4>
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', marginBottom: '32px' }}>
                            <table className="modern-table" style={{ margin: 0 }}>
                                <thead style={{ background: 'var(--bg-app)' }}>
                                    <tr>
                                        <th style={{ padding: '12px 20px' }}>Item</th>
                                        <th style={{ padding: '12px 20px' }}>Qty</th>
                                        <th style={{ padding: '12px 20px' }}>Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewingOrder.items?.map((item, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '12px 20px', border: 'none' }}>{item.name}</td>
                                            <td style={{ padding: '12px 20px', border: 'none' }}>{item.quantity}</td>
                                            <td style={{ padding: '12px 20px', border: 'none' }}>₹{item.price}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot style={{ background: 'var(--bg-app)', fontWeight: 800 }}>
                                    <tr>
                                        <td colSpan="2" style={{ padding: '12px 20px', border: 'none' }}>Total Amount</td>
                                        <td style={{ padding: '12px 20px', border: 'none' }}>₹{viewingOrder.total}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setViewModalOpen(false)}>Close Details</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancellation Modal */}
            {cancelModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <h3>Cancel Order</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '12px 0 24px' }}>Please provide a reason for cancelling this order.</p>
                        <div className="input-group">
                            <label>Reason</label>
                            <input type="text" placeholder="Out of stock, invalid address..." value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} autoFocus />
                        </div>
                        <div className="modal-actions" style={{ marginTop: '24px' }}>
                            <button className="btn-outline" style={{ flex: 1 }} onClick={() => { setCancelModalOpen(false); setOrderToCancel(null); }}>Keep Order</button>
                            <button className="btn-primary" style={{ flex: 1, background: 'var(--danger)', boxShadow: 'none' }} onClick={confirmCancellation}>Confirm Cancellation</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
