import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Type, IndianRupee, AlignLeft, Image as ImageIcon, ListFilter, Fingerprint, Search, RotateCcw } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [categories, setCategories] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', price: '', categoryId: '', description: '', image: '', stock: 50, retailerId: '' });
    
    const initialFilters = {
        search: '',
        categoryId: '',
        stockStatus: ''
    };
    const [filters, setFilters] = useState(initialFilters);
    const navigate = useNavigate();

    const isAdmin = localStorage.getItem('adminRole') === 'superadmin';

    const fetchProducts = async (page = 1, overrideTenant = selectedTenant) => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        let url = `${API_ENDPOINTS.PRODUCTS}?page=${page}&limit=10&branchId=${branchId}`;
        
        if (isAdmin && overrideTenant) url += `&tenantId=${overrideTenant}`;
        if (filters.search) url += `&search=${filters.search}`;
        if (filters.categoryId) url += `&categoryId=${filters.categoryId}`;
        if (filters.stockStatus) url += `&stockStatus=${filters.stockStatus}`;

        const res = await fetch(url, { headers: getHeaders() });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setProducts(result.data || []);
        setPagination({ page: result.page, totalPages: result.totalPages });
    };

    const fetchCategories = async () => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        const res = await fetch(`${API_ENDPOINTS.CATEGORIES}?branchId=${branchId}`, { headers: getHeaders() });
        const data = await res.json();
        setCategories(data.data || data);
    };

    const fetchTenants = async () => {
        if (!isAdmin) return;
        try {
            const res = await fetch(API_ENDPOINTS.TENANTS, { headers: getHeaders() });
            const data = await res.json();
            setTenants(data.data || data);
        } catch (e) {
            console.error('Error fetching tenants', e);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchTenants();
    }, [filters, selectedTenant]);

    const handlePageChange = (newPage) => {
        fetchProducts(newPage);
    };

    const clearFilters = () => {
        setFilters(initialFilters);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = formData.id ? `${API_ENDPOINTS.PRODUCTS}/${formData.id}` : API_ENDPOINTS.PRODUCTS;
        const method = formData.id ? 'PUT' : 'POST';

        const body = { ...formData };
        const branchId = localStorage.getItem('selectedBranchId');
        if (!formData.id && branchId) body.branchId = branchId;

        await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(body)
        });

        setModalOpen(false);
        fetchProducts(pagination.page);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this product?')) {
            await fetch(`${API_ENDPOINTS.PRODUCTS}/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            fetchProducts(pagination.page);
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setFormData({ ...item });
        } else {
            setFormData({ id: null, name: '', price: '', categoryId: categories[0]?.id || '', description: '', image: '', stock: 50, retailerId: '' });
        }
        setModalOpen(true);
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Product Catalog</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Manage your inventory, pricing, and product details</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {isAdmin && (
                        <div className="input-group" style={{ marginBottom: 0, width: '200px' }}>
                            <select
                                value={selectedTenant}
                                onChange={(e) => setSelectedTenant(e.target.value)}
                                style={{ height: '44px' }}
                            >
                                <option value="">All Tenants</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button className="btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Add Product
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="white-card" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Search Product</label>
                        <div className="input-with-icon">
                            <Search size={16} className="field-icon" />
                            <input 
                                type="text" 
                                placeholder="Name or ID..." 
                                value={filters.search} 
                                onChange={e => setFilters({ ...filters, search: e.target.value })} 
                            />
                        </div>
                    </div>
                    
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Category</label>
                        <select 
                            value={filters.categoryId} 
                            onChange={e => setFilters({ ...filters, categoryId: e.target.value })}
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Stock Status</label>
                        <select 
                            value={filters.stockStatus} 
                            onChange={e => setFilters({ ...filters, stockStatus: e.target.value })}
                        >
                            <option value="">All Stock Levels</option>
                            <option value="in_stock">In Stock (&gt;10)</option>
                            <option value="low_stock">Low Stock (1-10)</option>
                            <option value="out_of_stock">Out of Stock (0)</option>
                        </select>
                    </div>

                    <div>
                        <button 
                            className="btn-outline" 
                            style={{ 
                                width: '100%', 
                                height: '45px', 
                                justifyContent: 'center', 
                                color: 'var(--danger)', 
                                borderColor: 'var(--danger)', 
                                opacity: filters.search || filters.categoryId || filters.stockStatus ? 1 : 0.5 
                            }} 
                            onClick={clearFilters}
                            disabled={!(filters.search || filters.categoryId || filters.stockStatus)}
                        >
                            <RotateCcw size={16} /> Reset
                        </button>
                    </div>
                </div>
            </div>

            <div className="white-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>Image</th>
                            <th>Product Details</th>
                            <th>Category</th>
                            <th>Inventory</th>
                            <th>Price</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(prod => (
                            <tr key={prod.id}>
                                <td>
                                    <img 
                                        src={prod.image} 
                                        alt={prod.name} 
                                        style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', background: '#f1f5f9' }} 
                                    />
                                </td>
                                <td>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{prod.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>ID: #{prod.id}</div>
                                </td>
                                <td>
                                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{prod.category?.name || 'Uncategorized'}</span>
                                </td>
                                <td>
                                    <div className={`status-pill ${prod.stock === 0 ? 'danger' : prod.stock <= 10 ? 'warning' : 'success'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontWeight: 700 }}>{prod.stock}</span> units
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--accent)' }}>₹{prod.price}</div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button className="btn-outline" style={{ padding: '8px' }} onClick={() => openModal(prod)} title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="btn-outline" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => handleDelete(prod.id)} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {products.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                        <ImageIcon size={64} style={{ opacity: 0.1, marginBottom: '24px' }} />
                        <h3>No products found</h3>
                        <p>Try adjusting your filters or add a new product.</p>
                    </div>
                )}

                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>

            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '700px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3>{formData.id ? 'Edit Product' : 'Add New Product'}</h3>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div className="input-group">
                                    <label>Product Name</label>
                                    <input type="text" placeholder="e.g. Premium Cotton Tee" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                                <div className="input-group">
                                    <label>Category</label>
                                    <select value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} required>
                                        <option value="" disabled>Choose a category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Price (INR)</label>
                                    <input type="number" placeholder="0.00" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                                </div>
                                <div className="input-group">
                                    <label>Initial Stock Level</label>
                                    <input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} required />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Description</label>
                                <textarea rows="3" placeholder="Describe the product features..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
                            </div>

                            <div className="input-group">
                                <label>Image URL</label>
                                <input type="url" placeholder="https://images.unsplash.com/..." value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} required />
                            </div>

                            <div style={{ padding: '20px', background: 'var(--accent-light)', borderRadius: '16px', marginBottom: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <Fingerprint size={18} className="text-accent" />
                                    <h4 style={{ fontSize: '14px', color: 'var(--accent)' }}>Meta Integration</h4>
                                </div>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label>Retailer ID (Meta Content ID)</label>
                                    <input type="text" placeholder="e.g. SKU_123" value={formData.retailerId} onChange={e => setFormData({ ...formData, retailerId: e.target.value })} />
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Must match the Content ID in your Meta Commerce Manager catalog.</p>
                                </div>
                            </div>

                            <div className="modal-actions" style={{ gap: '12px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{formData.id ? 'Save Changes' : 'Create Product'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
