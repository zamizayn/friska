import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Type, IndianRupee, AlignLeft, Image as ImageIcon, ListFilter, Fingerprint, Search, RotateCcw, X } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [categories, setCategories] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', price: '', categoryId: '', description: '', image: '', stock: 50, retailerId: '', priority: '' });
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const initialFilters = {
        search: '',
        categoryId: '',
        stockStatus: '',
        sortBy: 'newest',
        sortOrder: 'DESC'
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
        if (filters.sortBy === 'priority') {
            url += `&sortBy=priority&sortOrder=${filters.sortOrder}`;
        }

        const res = await fetch(url, { headers: getHeaders() });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setProducts(result.data || []);
        setPagination({ page: result.page, totalPages: result.totalPages, total: result.total || 0 });
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

    const fetchSuggestions = async (query) => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }
        const branchId = localStorage.getItem('selectedBranchId') || '';
        let url = `${API_ENDPOINTS.PRODUCTS}/basic?search=${query}&branchId=${branchId}`;
        if (isAdmin && selectedTenant) url += `&tenantId=${selectedTenant}`;

        try {
            const res = await fetch(url, { headers: getHeaders() });
            const data = await res.json();
            setSuggestions(data || []);
        } catch (e) {
            console.error('Error fetching suggestions', e);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchTenants();
    }, [filters.categoryId, filters.stockStatus, filters.search, filters.sortBy, filters.sortOrder, selectedTenant]);

    useEffect(() => {
        if (!searchTerm) {
            setSuggestions([]);
            return;
        }
        const timer = setTimeout(() => {
            fetchSuggestions(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSearchSubmit = (value) => {
        setFilters({ ...filters, search: value });
        setShowSuggestions(false);
    };

    const handlePageChange = (newPage) => {
        fetchProducts(newPage);
    };

    const clearFilters = () => {
        setFilters(initialFilters);
        setSearchTerm('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = formData.id ? `${API_ENDPOINTS.PRODUCTS}/${formData.id}` : API_ENDPOINTS.PRODUCTS;
            const method = formData.id ? 'PUT' : 'POST';

            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (key !== 'image' && formData[key] !== null) {
                    data.append(key, formData[key]);
                }
            });

            if (selectedFile) {
                data.append('image', selectedFile);
            } else if (formData.image) {
                data.append('image', formData.image);
            }

            const branchId = localStorage.getItem('selectedBranchId');
            if (!formData.id && branchId) data.append('branchId', branchId);

            const headers = getHeaders();
            delete headers['Content-Type'];

            await fetch(url, {
                method,
                headers,
                body: data
            });

            setModalOpen(false);
            fetchProducts(pagination.page);
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Failed to save product');
        } finally {
            setLoading(false);
        }
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
            setImagePreview(item.image);
            setSelectedFile(null);
        } else {
            setFormData({ id: null, name: '', price: '', categoryId: categories[0]?.id || '', description: '', image: '', stock: 50, retailerId: '', priority: '' });
            setImagePreview(null);
            setSelectedFile(null);
        }
        setModalOpen(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h1>Product Catalog</h1>
                        <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                            {pagination.total} Products
                        </span>
                    </div>
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
                        <div className="input-with-icon" style={{ position: 'relative' }}>
                            <Search size={16} className="field-icon" />
                            <input
                                type="text"
                                placeholder="Name or ID..."
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSearchSubmit(searchTerm);
                                }}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                onFocus={() => setShowSuggestions(true)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        handleSearchSubmit('');
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                            {showSuggestions && suggestions.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: 'white',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    marginTop: '4px',
                                    zIndex: 100,
                                    boxShadow: 'var(--shadow-md)',
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}>
                                    {suggestions.map(s => (
                                        <div
                                            key={s.id}
                                            style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid var(--border-color)' }}
                                            className="suggestion-item"
                                            onClick={() => {
                                                setSearchTerm(s.name);
                                                handleSearchSubmit(s.name);
                                            }}
                                        >
                                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stock: {s.stock} | ₹{s.price}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
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

                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Sort By</label>
                        <select
                            value={`${filters.sortBy}-${filters.sortOrder}`}
                            onChange={e => {
                                const [by, order] = e.target.value.split('-');
                                setFilters({ ...filters, sortBy: by, sortOrder: order });
                            }}
                        >
                            <option value="newest-DESC">Newest First</option>
                            <option value="priority-ASC">Priority (1 to 10)</option>
                            <option value="priority-DESC">Priority (10 to 1)</option>
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
                                opacity: filters.search || filters.categoryId || filters.stockStatus || filters.sortBy !== 'newest' ? 1 : 0.5
                            }}
                            onClick={clearFilters}
                            disabled={!(filters.search || filters.categoryId || filters.stockStatus || filters.sortBy !== 'newest')}
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
                            <th>Priority</th>
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
                                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{prod.priority || 0}</span>
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
                                <label>Product Image</label>
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    {imagePreview && (
                                        <div style={{ width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--border-color)', flexShrink: 0 }}>
                                            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ padding: '8px' }}
                                        />
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Recommended: Square image (800x800px)</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '20px', background: 'var(--accent-light)', borderRadius: '16px', marginBottom: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <Fingerprint size={18} className="text-accent" />
                                    <h4 style={{ fontSize: '14px', color: 'var(--accent)' }}>Meta Integration</h4>
                                </div>
                                <div className="input-group">
                                    <label>Retailer ID (Meta Content ID)</label>
                                    <input type="text" placeholder="e.g. SKU_123" value={formData.retailerId} onChange={e => setFormData({ ...formData, retailerId: e.target.value })} />
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Must match the Content ID in your Meta Commerce Manager catalog.</p>
                                </div>
                                <div className="input-group" style={{ marginBottom: 0, marginTop: '16px' }}>
                                    <label>Priority (1 shows first, then 2, 3...)</label>
                                    <input type="number" placeholder="e.g. 1" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} />
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Products with lower priority numbers will appear first in the WhatsApp catalog.</p>
                                </div>
                            </div>

                            <div className="modal-actions" style={{ gap: '12px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)} disabled={loading}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={loading}>
                                    {loading ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                                            {formData.id ? 'Updating...' : 'Creating...'}
                                        </div>
                                    ) : (
                                        formData.id ? 'Save Changes' : 'Create Product'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
