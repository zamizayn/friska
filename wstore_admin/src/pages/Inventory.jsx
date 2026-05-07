import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, AlertTriangle, Plus, Minus, ArrowRightLeft, Search } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Inventory() {
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [lowStockOnly, setLowStockOnly] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [adjustmentType, setAdjustmentType] = useState('add'); // 'add' or 'deduct'
    const [adjustmentAmount, setAdjustmentAmount] = useState('');

    const navigate = useNavigate();

    const fetchInventory = async (page = 1) => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        const res = await fetch(`${API_ENDPOINTS.PRODUCTS}?page=${page}&limit=10&branchId=${branchId}`, { headers: getHeaders() });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setProducts(result.data);
        setPagination({ page: result.page, totalPages: result.totalPages });
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handlePageChange = (newPage) => {
        fetchInventory(newPage);
    };

    const openAdjustModal = (product) => {
        setSelectedProduct(product);
        setAdjustmentType('add');
        setAdjustmentAmount('');
        setModalOpen(true);
    };

    const handleAdjustStock = async (e) => {
        e.preventDefault();
        if (!selectedProduct) return;

        const amount = parseInt(adjustmentAmount, 10);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount greater than 0');
            return;
        }

        let newStock = selectedProduct.stock;
        if (adjustmentType === 'add') {
            newStock += amount;
        } else {
            newStock -= amount;
            if (newStock < 0) newStock = 0; // Prevent negative stock
        }

        const url = `${API_ENDPOINTS.PRODUCTS}/${selectedProduct.id}`;

        await fetch(url, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ stock: newStock })
        });

        setModalOpen(false);
        fetchInventory(pagination.page);
    };

    const filteredProducts = lowStockOnly
        ? products.filter(p => p.stock <= 10)
        : products;

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Inventory Management</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Monitor stock levels and perform quick adjustments</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'white', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 500 }}>
                        <input
                            type="checkbox"
                            checked={lowStockOnly}
                            onChange={(e) => setLowStockOnly(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                        />
                        <AlertTriangle size={16} color={lowStockOnly ? '#ef4444' : 'var(--text-muted)'} />
                        Low Stock Only
                    </label>
                </div>
            </header>

            <div className="stats-grid" style={{ marginBottom: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                <div className="white-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '56px', height: '56px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Boxes size={28} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Tracked Items</p>
                        <h3 style={{ fontSize: '24px', margin: 0 }}>{products.length}</h3>
                    </div>
                </div>
                <div className="white-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '56px', height: '56px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Low Stock Alert</p>
                        <h3 style={{ fontSize: '24px', margin: 0 }}>{products.filter(p => p.stock <= 10).length}</h3>
                    </div>
                </div>
            </div>

            <div className="white-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Current Stock</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(prod => (
                            <tr key={prod.id}>
                                <td>
                                    <img 
                                        src={prod.image} 
                                        alt={prod.name} 
                                        style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} 
                                    />
                                </td>
                                <td>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{prod.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: #{prod.id}</div>
                                </td>
                                <td>{prod.category?.name || 'Uncategorized'}</td>
                                <td>
                                    {prod.stock === 0 ? (
                                        <span className="status-pill warning" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Out of Stock</span>
                                    ) : prod.stock <= 10 ? (
                                        <span className="status-pill warning">Low Stock</span>
                                    ) : (
                                        <span className="status-pill success">In Stock</span>
                                    )}
                                </td>
                                <td>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: prod.stock <= 10 ? '#ef4444' : 'var(--text-main)' }}>
                                        {prod.stock}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn-outline" onClick={() => openAdjustModal(prod)} style={{ padding: '8px 16px', fontSize: '13px' }}>
                                        <ArrowRightLeft size={16} /> Adjust
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                    No products found matching the criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {!lowStockOnly && (
                    <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
                        <Pagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>

            {modalOpen && selectedProduct && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '480px', padding: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                            <img src={selectedProduct.image} alt="" style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }} />
                            <div>
                                <h3 style={{ margin: 0 }}>Adjust Stock</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>{selectedProduct.name}</p>
                            </div>
                        </div>

                        <div style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: '16px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Current Inventory</span>
                            <span style={{ fontSize: '24px', fontWeight: 800 }}>{selectedProduct.stock}</span>
                        </div>

                        <form onSubmit={handleAdjustStock}>
                            <div className="input-group">
                                <label>Action</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustmentType('add')}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            borderRadius: '12px',
                                            border: `2px solid ${adjustmentType === 'add' ? 'var(--success)' : 'var(--border-color)'}`,
                                            background: adjustmentType === 'add' ? 'rgba(16, 185, 129, 0.05)' : 'white',
                                            color: adjustmentType === 'add' ? 'var(--success)' : 'var(--text-main)',
                                            fontWeight: 700,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <Plus size={18} /> Add
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustmentType('deduct')}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            borderRadius: '12px',
                                            border: `2px solid ${adjustmentType === 'deduct' ? 'var(--danger)' : 'var(--border-color)'}`,
                                            background: adjustmentType === 'deduct' ? 'rgba(239, 68, 68, 0.05)' : 'white',
                                            color: adjustmentType === 'deduct' ? 'var(--danger)' : 'var(--text-main)',
                                            fontWeight: 700,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <Minus size={18} /> Deduct
                                    </button>
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Quantity</label>
                                <input
                                    type="number"
                                    placeholder="Enter amount..."
                                    value={adjustmentAmount}
                                    onChange={e => setAdjustmentAmount(e.target.value)}
                                    min="1"
                                    required
                                    style={{ fontSize: '18px', fontWeight: 700, padding: '16px' }}
                                />
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: '32px', padding: '12px', background: 'var(--bg-app)', borderRadius: '12px', fontSize: '14px', fontWeight: 600 }}>
                                New stock will be: <span style={{ color: 'var(--accent)', fontSize: '18px' }}>
                                    {adjustmentType === 'add'
                                        ? selectedProduct.stock + (parseInt(adjustmentAmount) || 0)
                                        : Math.max(0, selectedProduct.stock - (parseInt(adjustmentAmount) || 0))
                                    }
                                </span>
                            </div>

                            <div className="modal-actions" style={{ gap: '12px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center', background: adjustmentType === 'add' ? 'var(--success)' : 'var(--danger)' }}>
                                    Confirm Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
