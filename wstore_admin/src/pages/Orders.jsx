import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageOpen, Plus, User, MapPin, Trash2, IndianRupee, Copy, Check, Eye, Search, Filter, Calendar, Clock, X, CheckCircle, Wallet, CreditCard, TrendingUp, RotateCcw, Send, Bike, FileText, History } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';

const parseCatalogDescription = (description) => {
    if (!description) return [];
    const lines = description.split('\n');
    const items = [];
    
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
            const cleanLine = line.substring(1).trim();
            // Matches formats like "Chocolate Milkshake x2 - ₹240" or "Item Name x 1 - 150" or "Item Name x3"
            const regex = /(.+?)\s+x\s*(\d+)(?:\s*-\s*₹?\s*([\d,]+(?:\.\d+)?))?$/i;
            const match = cleanLine.match(regex);
            if (match) {
                const name = match[1].trim();
                const quantity = parseInt(match[2], 10);
                const price = match[3] ? match[3].replace(/,/g, '') : '';
                items.push({
                    name,
                    quantity,
                    price: price ? parseFloat(price) : 0,
                    isCatalog: true
                });
            } else {
                items.push({
                    name: cleanLine,
                    quantity: 1,
                    price: 0,
                    isCatalog: true
                });
            }
        }
    }
    return items;
};

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [summary, setSummary] = useState({ completed: 0, pending: 0, collected: 0, pendingCollection: 0 });
    const [copiedId, setCopiedId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');
    const [selectedRawAddress, setSelectedRawAddress] = useState('');
    const [viewingOrder, setViewingOrder] = useState(null);
    const [customerHistoryOpen, setCustomerHistoryOpen] = useState(false);
    const [customerHistory, setCustomerHistory] = useState([]);
    const [customerHistoryPhone, setCustomerHistoryPhone] = useState('');
    const [customerHistoryName, setCustomerHistoryName] = useState('');
    const [customerHistoryPagination, setCustomerHistoryPagination] = useState({ page: 1, totalPages: 1 });
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [orderToCancel, setOrderToCancel] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [orderToMarkPaid, setOrderToMarkPaid] = useState(null);
    const [paymentModalMode, setPaymentModalMode] = useState('mark-paid');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
    const searchTimeoutRef = useRef(null);
    const role = localStorage.getItem('adminRole');
    const [branches, setBranches] = useState([]);
    const defaultBranchId = role === 'branch'
        ? localStorage.getItem('branchId') || ''
        : localStorage.getItem('selectedBranchId') || '';
    const [products, setProducts] = useState([]);
    const [customerAddresses, setCustomerAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [showAddAddress, setShowAddAddress] = useState(false);
    const [newAddressText, setNewAddressText] = useState('');
    const [formData, setFormData] = useState({
        customerPhone: '',
        customerName: '',
        address: '',
        formattedAddress: '',
        items: [],
        status: 'pending',
        paymentMethod: 'Cash on Delivery',
        discountAmount: '',
        branchId: defaultBranchId
    });

    const today = format(new Date(), 'yyyy-MM-dd');
    const initialFilters = {
        status: '',
        search: '',
        startDate: today,
        endDate: today
    };
    const [filters, setFilters] = useState(initialFilters);
    const [deliveryBoys, setDeliveryBoys] = useState([]);
    const [selectedDeliveryBoyId, setSelectedDeliveryBoyId] = useState('');
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

    const fetchDeliveryBoys = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.DELIVERY_BOYS, { headers: getHeaders() });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error('[DeliveryBoys] Failed to fetch:', res.status, err.error || res.statusText);
                return;
            }
            const data = await res.json();
            setDeliveryBoys(data);
        } catch (e) {
            console.error('[DeliveryBoys] Fetch error:', e.message);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchProducts();
        fetchDeliveryBoys();
    }, [filters]);

    useEffect(() => {
        if (role === 'superadmin' || role === 'tenant') {
            fetch(API_ENDPOINTS.BRANCHES, { headers: getHeaders() })
                .then(res => res.json())
                .then(data => setBranches(data))
                .catch(() => {});
        }
    }, [role]);

    const handlePageChange = (newPage) => {
        fetchOrders(newPage);
    };

    const fetchCustomerOrders = async (order, page = 1) => {
        try {
            const res = await fetch(`${API_ENDPOINTS.CUSTOMERS}/${order.customerPhone}/orders?page=${page}&limit=10`, {
                headers: getHeaders()
            });
            if (res.status === 401) return navigate('/login');
            const result = await res.json();
            setCustomerHistory(result.data || []);
            setCustomerHistoryPagination({ page: result.page, totalPages: result.totalPages });
            setCustomerHistoryName(order.customer?.name || 'Guest Customer');
            setCustomerHistoryPhone(order.customerPhone);
            setCustomerHistoryOpen(true);
        } catch (e) {
            console.error('Failed to fetch customer orders:', e);
        }
    };

    const handleExportPdf = async () => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        let url = `${API_ENDPOINTS.ORDERS}/export/pdf?branchId=${branchId}`;
        if (filters.status) url += `&status=${filters.status}`;
        if (filters.search) url += `&search=${filters.search}`;
        if (filters.startDate) url += `&startDate=${filters.startDate}`;
        if (filters.endDate) url += `&endDate=${filters.endDate}`;

        try {
            const res = await fetch(url, { headers: getHeaders() });
            if (res.status === 401) return navigate('/login');
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `orders_report_${filters.startDate || 'all'}_${filters.endDate || 'all'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (e) {
            console.error('PDF export failed:', e);
        }
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
        if (newPaymentStatus === 'paid') {
            setOrderToMarkPaid(id);
            setPaymentModalMode('mark-paid');
            setPaymentModalOpen(true);
            return;
        }

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

    const confirmPaid = async (collectedVia) => {
        await fetch(`${API_ENDPOINTS.ORDERS}/${orderToMarkPaid}/payment-status`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ paymentStatus: 'paid', collectedVia })
        });
        setPaymentModalOpen(false);
        setOrderToMarkPaid(null);
        fetchOrders(pagination.page);
        if (viewingOrder && viewingOrder.id === orderToMarkPaid) {
            setViewingOrder({ ...viewingOrder, paymentStatus: 'paid', collectedVia });
        }
    };

    const openPaymentViaEditor = (id) => {
        setOrderToMarkPaid(id);
        setPaymentModalMode('update-via');
        setPaymentModalOpen(true);
    };

    const handlePhoneSearch = (phone) => {
        setFormData({ ...formData, customerPhone: phone, customerName: '' });

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (phone.length >= 3) {
            searchTimeoutRef.current = setTimeout(async () => {
                try {
                    const res = await fetch(`${API_ENDPOINTS.CUSTOMERS}?search=${encodeURIComponent(phone)}&limit=5`, { headers: getHeaders() });
                    const data = await res.json();
                    setCustomerSearchResults(data.data || []);
                    setCustomerSearchOpen(true);
                } catch {
                    setCustomerSearchResults([]);
                    setCustomerSearchOpen(false);
                }
            }, 300);
        } else {
            setCustomerSearchResults([]);
            setCustomerSearchOpen(false);
        }
    };

    const selectCustomer = (customer) => {
        setFormData({ ...formData, customerPhone: customer.phone, customerName: customer.name, address: '', formattedAddress: '' });
        setCustomerSearchOpen(false);
        setSelectedAddressId(null);
        setShowAddAddress(false);
        setNewAddressText('');
        fetch(`${API_ENDPOINTS.CUSTOMERS}/${customer.phone}/addresses`, { headers: getHeaders() })
            .then(res => res.json())
            .then(data => {
                setCustomerAddresses(data || []);
                if (data && data.length > 0) {
                    setSelectedAddressId(data[0].id);
                    setFormData(prev => ({ ...prev, address: data[0].address, formattedAddress: data[0].formattedAddress || data[0].address }));
                }
            })
            .catch(() => setCustomerAddresses([]));
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

        const subtotal = calculateTotal();
        const discountAmount = parseFloat(formData.discountAmount) || 0;
        const total = Math.max(0, subtotal - discountAmount);
        await fetch(API_ENDPOINTS.ORDERS, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ...formData, discountAmount, subtotalBeforeTax: subtotal, total })
        });

        setModalOpen(false);
        setFormData({ customerPhone: '', customerName: '', address: '', formattedAddress: '', items: [], status: 'pending', paymentMethod: 'Cash on Delivery', discountAmount: '', branchId: defaultBranchId });
        setCustomerAddresses([]);
        setSelectedAddressId(null);
        setShowAddAddress(false);
        setNewAddressText('');
        fetchOrders();
    };

    const handleAssignDeliveryBoy = async () => {
        if (!viewingOrder || !selectedDeliveryBoyId) return;
        try {
            const res = await fetch(`${API_ENDPOINTS.ORDERS}/${viewingOrder.id}/assign-delivery`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ deliveryBoyId: parseInt(selectedDeliveryBoyId) })
            });
            if (res.ok) {
                setViewingOrder(prev => ({ ...prev, deliveryBoyId: parseInt(selectedDeliveryBoyId) }));
                setSelectedDeliveryBoyId('');
                fetchOrders();
                fetchDeliveryBoys();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || `Assignment failed (${res.status})`);
            }
        } catch (e) {
            alert('Failed to assign delivery boy');
        }
    };

    const handleForwardToDelivery = (order) => {
        const orderId = order.id;
        const customerName = order.customer?.name || order.customerName || 'N/A';
        const customerPhone = order.customerPhone;
        const address = order.formattedAddress || order.address;
        const mapLink = order.address?.startsWith('http') ? order.address : '';
        const paymentMethod = order.paymentMethod || 'COD';
        
        const paymentStatus = String(order.paymentStatus || '').toLowerCase();
        const amountToCollect = paymentStatus !== 'paid' ? (order.total || 0) : 0;

        let itemsList = '';
        if (order.items && order.items.length > 0) {
            const list = [];
            order.items.forEach(item => {
                if (item.isCatalog && item.description) {
                    const parsed = parseCatalogDescription(item.description);
                    if (parsed.length > 0) {
                        parsed.forEach(p => {
                            list.push(`- ${p.name} (x${p.quantity})`);
                        });
                    } else {
                        list.push(`- ${item.name} (x${item.quantity})`);
                    }
                } else {
                    list.push(`- ${item.name} (x${item.quantity})`);
                }
            });
            itemsList = '\n\n*Items:*\n' + list.join('\n');
        }

        const text = `🚚 *New Delivery Assignment*\n\n*Order ID:* #${orderId}\n*Customer:* ${customerName}\n*Phone:* ${customerPhone}\n*Address:* ${address}${mapLink ? `\n*Map Link:* ${mapLink}` : ''}${itemsList}\n\n*Payment Mode:* ${paymentMethod}\n*To Collect:* ₹${amountToCollect}\n\n*Please deliver as soon as possible!* 🛵`;

        const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
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
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-outline" onClick={handleExportPdf}>
                        <FileText size={18} /> Export PDF
                    </button>
                    <button className="btn-primary" onClick={() => { setFormData({ customerPhone: '', customerName: '', address: '', formattedAddress: '', items: [], status: 'pending', paymentMethod: 'Cash on Delivery', discountAmount: '', branchId: defaultBranchId }); setCustomerAddresses([]); setSelectedAddressId(null); setShowAddAddress(false); setNewAddressText(''); setModalOpen(true); }}>
                        <Plus size={18} /> Manual Order
                    </button>
                </div>
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
                            <th>Delivery Boy</th>
                            <th>Payment</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td style={{ fontWeight: 700 }}>#{order.id}</td>
                                <td>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>
                                        {order.customer?.name || 'Guest Customer'}
                                        {order.isNewCustomer && (
                                            <span style={{
                                                backgroundColor: '#22c55e',
                                                color: 'white',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                marginLeft: '8px',
                                                verticalAlign: 'middle'
                                            }}>New</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '2px' }}>{order.customerPhone}</div>
                                    {(order.formattedAddress || order.address) && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.formattedAddress || order.address}>
                                            📍 {order.formattedAddress || order.address}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        <Calendar size={10} style={{ marginRight: '4px' }} />
                                        {format(new Date(order.createdAt), 'dd MMM yyyy')}
                                        <Clock size={10} style={{ marginLeft: '8px', marginRight: '4px' }} />
                                        {format(new Date(order.createdAt), 'hh:mm a')}
                                    </div>
                                </td>
                                <td>
                                    {order.items?.some(item => item.isCatalog) ? (
                                        (() => {
                                            const catalogItem = order.items.find(item => item.isCatalog);
                                            const parsed = parseCatalogDescription(catalogItem?.description);
                                            return parsed.length || 1;
                                        })()
                                    ) : (
                                        order.items?.length || 0
                                    )} items
                                </td>
                                <td style={{ fontWeight: 700 }}>₹{order.total}</td>
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
                                    {order.deliveryBoy ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Bike size={14} />
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600 }}>{order.deliveryBoy.name}</div>
                                                <span className={`status-pill ${order.deliveryBoy.status === 'active' ? 'success' : 'danger'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                    {order.deliveryBoy.status}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>—</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{order.paymentMethod || 'COD'}</div>
                                        <select
                                            className={`status-pill ${order.paymentStatus === 'paid' ? 'success' : 'warning'}`}
                                            value={order.paymentStatus || 'unpaid'}
                                            onChange={(e) => updatePaymentStatus(order.id, e.target.value)}
                                            style={{ border: 'none', appearance: 'none', cursor: 'pointer', textAlign: 'center', fontSize: '12px', padding: '4px 8px' }}
                                        >
                                            <option value="unpaid">Unpaid</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                        {order.paymentStatus === 'paid' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {order.collectedVia ? (
                                                    <>
                                                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#16a34a', background: 'rgba(22,163,74,0.1)', padding: '1px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>
                                                            {order.collectedVia}
                                                        </span>
                                                        <button onClick={() => openPaymentViaEditor(order.id)} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }} title="Change mode">✎</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => openPaymentViaEditor(order.id)} style={{ fontSize: '9px', color: 'var(--accent)', background: 'none', border: '1px dashed var(--accent)', borderRadius: '4px', padding: '1px 6px', cursor: 'pointer' }}>
                                                        + Mode
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {order.paymentTransactionId && (
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                ID: {order.paymentTransactionId}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn-outline" style={{ padding: '6px' }} onClick={() => { setViewingOrder(order); setViewModalOpen(true); }}>
                                            <Eye size={16} />
                                        </button>
                                        <button className="btn-outline" style={{ padding: '6px' }} onClick={() => fetchCustomerOrders(order)} title="View past orders">
                                            <History size={16} />
                                        </button>
                                        <button className="btn-outline" style={{ padding: '6px' }} onClick={() => {
                                            setSelectedAddress(order.formattedAddress || order.address);
                                            setSelectedRawAddress(order.address);
                                            setAddressModalOpen(true);
                                        }}>
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
                                    <div className="input-group" style={{ position: 'relative' }}>
                                        <label>Customer Phone (WhatsApp)</label>
                                        <input type="text" placeholder="Start typing phone number..." value={formData.customerPhone} onChange={e => handlePhoneSearch(e.target.value)} onBlur={() => setTimeout(() => setCustomerSearchOpen(false), 200)} required />
                                        {customerSearchOpen && customerSearchResults.length > 0 && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                                {customerSearchResults.map(c => (
                                                    <div key={c.phone} onClick={() => selectCustomer(c)} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{c.name}</span>
                                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>+{c.phone}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="input-group">
                                        <label>Customer Name</label>
                                        <input type="text" placeholder="e.g. John Doe" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} required />
                                    </div>
                                    {customerAddresses.length > 0 && (
                                        <div className="input-group">
                                            <label>Saved Addresses</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {customerAddresses.map(addr => (
                                                    <div
                                                        key={addr.id}
                                                        onClick={() => {
                                                            setSelectedAddressId(addr.id);
                                                            setFormData({ ...formData, address: addr.address, formattedAddress: addr.formattedAddress || addr.address });
                                                            setShowAddAddress(false);
                                                        }}
                                                        style={{
                                                            padding: '10px 12px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            border: `2px solid ${selectedAddressId === addr.id ? 'var(--accent)' : 'var(--border-color)'}`,
                                                            background: selectedAddressId === addr.id ? 'rgba(99,102,241,0.05)' : 'transparent',
                                                            fontSize: '13px',
                                                            lineHeight: 1.4
                                                        }}
                                                    >
                                                        {addr.formattedAddress || addr.address}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    className="btn-outline"
                                                    style={{ padding: '6px 12px', fontSize: '12px', justifyContent: 'center' }}
                                                    onClick={() => setShowAddAddress(!showAddAddress)}
                                                >
                                                    {showAddAddress ? 'Cancel' : '+ Add New Address'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {showAddAddress && formData.customerPhone && (
                                        <div className="input-group" style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                            <label>New Address</label>
                                            <textarea
                                                style={{ height: '80px', marginBottom: '8px' }}
                                                placeholder="Enter address..."
                                                value={newAddressText}
                                                onChange={e => setNewAddressText(e.target.value)}
                                            />
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    className="btn-primary"
                                                    style={{ flex: 1, justifyContent: 'center', fontSize: '13px', padding: '8px' }}
                                                    disabled={!newAddressText.trim()}
                                                    onClick={async () => {
                                                        const res = await fetch(`${API_ENDPOINTS.CUSTOMERS}/${formData.customerPhone}/addresses`, {
                                                            method: 'POST',
                                                            headers: getHeaders(),
                                                            body: JSON.stringify({ address: newAddressText.trim(), formattedAddress: newAddressText.trim() })
                                                        });
                                                        if (res.ok) {
                                                            const newAddr = await res.json();
                                                            setCustomerAddresses(prev => [newAddr, ...prev]);
                                                            setSelectedAddressId(newAddr.id);
                                                            setFormData(prev => ({ ...prev, address: newAddr.address, formattedAddress: newAddr.formattedAddress || newAddr.address }));
                                                            setNewAddressText('');
                                                            setShowAddAddress(false);
                                                        }
                                                    }}
                                                >
                                                    Save Address
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {!customerAddresses.length && formData.customerPhone && (
                                        <div style={{ marginBottom: '16px' }}>
                                            <button
                                                type="button"
                                                className="btn-outline"
                                                style={{ padding: '6px 12px', fontSize: '12px', justifyContent: 'center' }}
                                                onClick={() => setShowAddAddress(!showAddAddress)}
                                            >
                                                {showAddAddress ? 'Cancel' : '+ Add New Address'}
                                            </button>
                                        </div>
                                    )}
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
                                        <label>Discount Amount (₹)</label>
                                        <input type="number" min="0" step="0.01" placeholder="0" value={formData.discountAmount} onChange={e => setFormData({ ...formData, discountAmount: e.target.value })} />
                                    </div>
                                    {(role === 'superadmin' || role === 'tenant') && (
                                        <div className="input-group">
                                            <label>Branch</label>
                                            <select value={formData.branchId || ''} onChange={e => setFormData({ ...formData, branchId: e.target.value })}>
                                                <option value="">Select Branch...</option>
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
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
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-muted)' }}>
                                                <span>Subtotal</span>
                                                <span>₹{calculateTotal()}</span>
                                            </div>
                                            {parseFloat(formData.discountAmount) > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--success)' }}>
                                                    <span>Discount</span>
                                                    <span>-₹{parseFloat(formData.discountAmount).toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 800 }}>
                                                <span>Total Amount</span>
                                                <span>₹{Math.max(0, calculateTotal() - (parseFloat(formData.discountAmount) || 0))}</span>
                                            </div>
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
                            <div style={{ fontWeight: 700, marginBottom: '8px' }}>📍 {selectedAddress}</div>
                            {selectedRawAddress?.startsWith('http') && selectedRawAddress !== selectedAddress && (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{selectedRawAddress}</div>
                            )}
                            {selectedRawAddress && !selectedRawAddress.startsWith('http') && selectedRawAddress !== selectedAddress && (
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', marginTop: '12px', paddingTop: '12px' }}>
                                    {selectedRawAddress}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => copyToClipboard(selectedAddress, 'addr')}>
                                {copiedId === 'addr' ? <Check size={18} /> : <Copy size={18} />} {copiedId === 'addr' ? 'Copied!' : 'Copy'}
                            </button>
                            {selectedRawAddress?.startsWith('http') && (
                                <a
                                    href={selectedRawAddress}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary"
                                    style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                                >
                                    <MapPin size={18} /> Open in Maps
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Order History Modal */}
            {customerHistoryOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '800px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3>Order History: {customerHistoryName} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '14px' }}>+{customerHistoryPhone}</span></h3>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setCustomerHistoryOpen(false)}>✕</button>
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
                                {customerHistory.map(order => (
                                    <tr key={order.id}>
                                        <td style={{ fontWeight: 700 }}>#{order.id}</td>
                                        <td>{format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}</td>
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
                        {customerHistory.length === 0 && (
                            <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No previous orders found for this customer.</p>
                        )}

                        {customerHistoryPagination.totalPages > 1 && (
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                                <Pagination
                                    currentPage={customerHistoryPagination.page}
                                    totalPages={customerHistoryPagination.totalPages}
                                    onPageChange={(page) => fetchCustomerOrders({ customerPhone: customerHistoryPhone, customer: { name: customerHistoryName } }, page)}
                                />
                            </div>
                        )}

                        <div style={{ marginTop: '32px' }}>
                            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setCustomerHistoryOpen(false); setCustomerHistory([]); }}>Done</button>
                        </div>
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

                        <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={16} color="var(--text-muted)" />
                                <span style={{ fontWeight: 600 }}>{format(new Date(viewingOrder.createdAt), 'dd MMMM yyyy')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={16} color="var(--text-muted)" />
                                <span style={{ fontWeight: 600 }}>{format(new Date(viewingOrder.createdAt), 'hh:mm a')}</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            <div>
                                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Customer Info</h4>
                                <p style={{ fontWeight: 700 }}>{viewingOrder.customer?.name || 'N/A'}</p>
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
                                    {viewingOrder.appliedOfferCode && (
                                        <div style={{ fontSize: '12px', background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, border: '1px dashed #10b981', display: 'inline-block', alignSelf: 'flex-start' }}>
                                            OFFER: {viewingOrder.appliedOfferCode}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Location Details</h4>
                            <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '12px', fontSize: '13px', lineHeight: 1.5, border: '1px solid var(--border-color)' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                    📍 {viewingOrder.formattedAddress || viewingOrder.address}
                                </div>
                                {viewingOrder.distanceFromBranch != null && (
                                    <div style={{ marginTop: '8px', color: 'var(--accent)', fontWeight: 700, fontSize: '14px' }}>
                                        📏 {viewingOrder.distanceFromBranch} km from hub
                                    </div>
                                )}
                                {viewingOrder.address?.startsWith('http') ? (
                                    <div style={{ marginTop: '12px' }}>
                                        <a href={viewingOrder.address} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                                            <MapPin size={14} /> Open in Google Maps
                                        </a>
                                    </div>
                                ) : (
                                    viewingOrder.address && viewingOrder.address !== viewingOrder.formattedAddress && (
                                        <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                            {viewingOrder.address}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Delivery Assignment</h4>
                            {viewingOrder.deliveryBoy ? (
                                <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                                    <Bike size={20} color="#16a34a" />
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#166534' }}>{viewingOrder.deliveryBoy.name}</div>
                                        <div style={{ fontSize: '13px', color: '#166534' }}>
                                            {viewingOrder.deliveryBoy.phone} — <span className={`status-pill ${viewingOrder.deliveryBoy.status === 'active' ? 'success' : 'danger'}`} style={{ padding: '1px 6px', fontSize: '11px' }}>{viewingOrder.deliveryBoy.status}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : viewingOrder.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <select
                                        style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px', background: 'white' }}
                                        value={selectedDeliveryBoyId}
                                        onChange={e => setSelectedDeliveryBoyId(e.target.value)}
                                    >
                                        <option value="">Select delivery boy…</option>
                                        {deliveryBoys
                                            .filter(b => b.status === 'active')
                                            .map(b => (
                                                <option key={b.id} value={b.id}>{b.name} ({b.phone})</option>
                                            ))}
                                    </select>
                                    <button
                                        className="btn-primary"
                                        style={{ whiteSpace: 'nowrap' }}
                                        disabled={!selectedDeliveryBoyId}
                                        onClick={handleAssignDeliveryBoy}
                                    >
                                        <Check size={16} /> Assign
                                    </button>
                                </div>
                            ) : (
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Not assigned</div>
                            )}
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
                                    {viewingOrder.items?.flatMap((item, i) => {
                                        if (item.isCatalog && item.description) {
                                            const parsed = parseCatalogDescription(item.description);
                                            if (parsed.length > 0) {
                                                return parsed.map((p, pi) => (
                                                    <tr key={`${i}-${pi}`}>
                                                        <td style={{ padding: '12px 20px', border: 'none' }}>{p.name}</td>
                                                        <td style={{ padding: '12px 20px', border: 'none' }}>{p.quantity}</td>
                                                        <td style={{ padding: '12px 20px', border: 'none' }}>₹{p.price}</td>
                                                    </tr>
                                                ));
                                            }
                                        }
                                        return (
                                            <tr key={i}>
                                                <td style={{ padding: '12px 20px', border: 'none' }}>{item.name}</td>
                                                <td style={{ padding: '12px 20px', border: 'none' }}>{item.quantity}</td>
                                                <td style={{ padding: '12px 20px', border: 'none' }}>₹{item.price}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot style={{ background: 'var(--bg-app)', fontWeight: 800 }}>
                                    {viewingOrder.discountAmount > 0 && (
                                        <>
                                            <tr style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                <td colSpan="2" style={{ padding: '8px 20px', border: 'none' }}>Subtotal</td>
                                                <td style={{ padding: '8px 20px', border: 'none' }}>₹{(viewingOrder.total + viewingOrder.discountAmount).toFixed(2)}</td>
                                            </tr>
                                            <tr style={{ fontSize: '13px', color: 'var(--success)' }}>
                                                <td colSpan="2" style={{ padding: '8px 20px', border: 'none' }}>Discount</td>
                                                <td style={{ padding: '8px 20px', border: 'none' }}>-₹{viewingOrder.discountAmount}</td>
                                            </tr>
                                        </>
                                    )}
                                    <tr style={{ fontSize: '16px' }}>
                                        <td colSpan="2" style={{ padding: '12px 20px', border: 'none' }}>Total Amount</td>
                                        <td style={{ padding: '12px 20px', border: 'none' }}>₹{viewingOrder.total}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="modal-actions" style={{ gap: '12px' }}>
                            <button className="btn-outline" style={{ flex: 1, justifyContent: 'center', borderColor: '#25d366', color: '#25d366' }} onClick={() => handleForwardToDelivery(viewingOrder)}>
                                <Send size={16} /> Forward to Delivery
                            </button>
                            <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setViewModalOpen(false)}>Close Details</button>
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

            {/* Payment Modal */}
            {paymentModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <h3>{paymentModalMode === 'mark-paid' ? 'Mark as Paid' : 'Update Payment Mode'}</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '12px 0 24px' }}>
                            {paymentModalMode === 'mark-paid' ? 'How was the payment collected?' : 'Select the payment mode'}
                        </p>
                        <div className="modal-actions" style={{ marginTop: '8px' }}>
                            <button className="btn-outline" style={{ flex: 1 }} onClick={() => { setPaymentModalOpen(false); setOrderToMarkPaid(null); }}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 1 }} onClick={() => confirmPaid('cash')}>Cash</button>
                            <button className="btn-primary" style={{ flex: 1, background: 'var(--accent)' }} onClick={() => confirmPaid('account')}>Account</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
