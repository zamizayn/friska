import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShoppingBag, IndianRupee, Search, Calendar, Filter, ArrowUpDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function ProductSales() {
    const [salesData, setSalesData] = useState([]);
    const [products, setProducts] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProductId, setSelectedProductId] = useState('all');
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const navigate = useNavigate();
    const role = localStorage.getItem('adminRole');

    const fetchTenants = async () => {
        if (role !== 'superadmin') return;
        try {
            const res = await fetch(API_ENDPOINTS.TENANTS, { headers: getHeaders() });
            const data = await res.json();
            setTenants(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const fetchBranchesList = async (tId) => {
        try {
            let url = API_ENDPOINTS.BRANCHES;
            if (tId) url += `?tenantId=${tId}`;
            const res = await fetch(url, { headers: getHeaders() });
            const data = await res.json();
            setBranches(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const fetchSalesData = async () => {
        setLoading(true);
        try {
            let url = `${API_ENDPOINTS.PRODUCT_SALES}?`;
            if (selectedTenantId) url += `tenantId=${selectedTenantId}&`;
            if (selectedBranchId) url += `branchId=${selectedBranchId}&`;
            if (startDate) url += `startDate=${startDate}&`;
            if (endDate) url += `endDate=${endDate}&`;

            const res = await fetch(url, { headers: getHeaders() });
            if (res.status === 401) return navigate('/login');
            
            const data = await res.json();
            setSalesData(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch product sales:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchProductsForFilter = async () => {
        try {
            let url = `${API_ENDPOINTS.PRODUCTS_BASIC}?`;
            if (selectedTenantId) url += `tenantId=${selectedTenantId}&`;
            if (selectedBranchId) url += `branchId=${selectedBranchId}&`;
            const res = await fetch(url, { headers: getHeaders() });
            const data = await res.json();
            setProducts(data || []);
        } catch (e) {
            console.error('Failed to fetch products list:', e);
        }
    };

    useEffect(() => {
        if (role === 'superadmin') fetchTenants();
        if (role === 'tenant') fetchBranchesList();
        
        // Use global selection from localStorage if on page load
        const globalBranchId = localStorage.getItem('selectedBranchId');
        if (globalBranchId && role !== 'superadmin') {
            setSelectedBranchId(globalBranchId);
        }
    }, [role]);

    useEffect(() => {
        fetchSalesData();
        fetchProductsForFilter();
    }, [startDate, endDate, selectedTenantId, selectedBranchId]);

    const filteredData = Array.isArray(salesData) ? salesData.filter(p => 
        selectedProductId === 'all' || String(p.id) === String(selectedProductId)
    ) : [];

    // Pagination Logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const topProducts = Array.isArray(salesData) ? salesData.slice(0, 10).filter(p => p.totalRevenue > 0) : [];
    const totalRevenue = Array.isArray(salesData) ? salesData.reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0) : 0;
    const totalQty = Array.isArray(salesData) ? salesData.reduce((acc, curr) => acc + (curr.totalQuantity || 0), 0) : 0;

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div className="dashboard-content">
            <header className="page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Product Sales Analytics</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Track performance and revenue per product</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {role === 'superadmin' && (
                        <div className="input-group-row">
                            <select 
                                value={selectedTenantId} 
                                onChange={e => {
                                    setSelectedTenantId(e.target.value);
                                    setSelectedBranchId('');
                                    fetchBranchesList(e.target.value);
                                }}
                                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: 600, minWidth: '140px' }}
                            >
                                <option value="">All Tenants</option>
                                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    )}
                    {(role === 'superadmin' || role === 'tenant') && (
                        <div className="input-group-row">
                            <select 
                                value={selectedBranchId} 
                                onChange={e => setSelectedBranchId(e.target.value)}
                                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: 600, minWidth: '140px' }}
                            >
                                <option value="">All Branches</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="input-group-row">
                        <Calendar size={16} />
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="input-group-row">
                        <Calendar size={16} />
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <button className="btn-primary" onClick={fetchSalesData}>Apply</button>
                </div>
            </header>

            <div className="stats-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div className="white-card stat-mini">
                    <div className="stat-icon-box" style={{ background: '#e0e7ff', color: '#6366f1' }}><IndianRupee size={20} /></div>
                    <div>
                        <label>Total Revenue</label>
                        <div className="value">₹{totalRevenue.toLocaleString()}</div>
                    </div>
                </div>
                <div className="white-card stat-mini">
                    <div className="stat-icon-box" style={{ background: '#dcfce7', color: '#10b981' }}><ShoppingBag size={20} /></div>
                    <div>
                        <label>Units Sold</label>
                        <div className="value">{totalQty.toLocaleString()}</div>
                    </div>
                </div>
                <div className="white-card stat-mini">
                    <div className="stat-icon-box" style={{ background: '#fef3c7', color: '#f59e0b' }}><TrendingUp size={20} /></div>
                    <div>
                        <label>Avg. Price/Item</label>
                        <div className="value">₹{totalQty > 0 ? Math.round(totalRevenue / totalQty) : 0}</div>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <div className="main-stats">
                    <div className="white-card" style={{ padding: '24px' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px' }}>Product Performance</h3>
                            <div className="filter-wrapper" style={{ display: 'flex', gap: '12px' }}>
                                <div className="select-box-mini">
                                    <ShoppingBag size={14} />
                                    <select
                                        value={selectedProductId}
                                        onChange={e => { setSelectedProductId(e.target.value); setCurrentPage(1); }}
                                    >
                                        <option value="all">All Products</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        {loading ? (
                            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div className="spinner"></div>
                                <p style={{ marginTop: '12px' }}>Analyzing sales data...</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th className="col-name">Product Name</th>
                                            <th className="col-price">Price</th>
                                            <th className="col-qty">Qty Sold</th>
                                            <th className="col-revenue">Revenue</th>
                                            <th className="col-trend">Share</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.length === 0 ? (
                                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>No sales data found for the selected criteria.</td></tr>
                                        ) : (
                                            paginatedData.map((p, i) => (
                                                <tr key={p.id}>
                                                    <td className="col-name">
                                                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {p.id}</div>
                                                    </td>
                                                    <td className="col-price" style={{ fontWeight: 600 }}>₹{p.price}</td>
                                                    <td className="col-qty" style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.totalQuantity}</td>
                                                    <td className="col-revenue" style={{ fontWeight: 800, color: 'var(--accent)' }}>₹{p.totalRevenue.toLocaleString()}</td>
                                                    <td className="col-trend">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div className="progress-bar-small">
                                                                <div style={{
                                                                    width: `${(p.totalRevenue / (salesData[0]?.totalRevenue || 1)) * 100}%`,
                                                                    background: COLORS[i % COLORS.length]
                                                                }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                                                                {Math.round((p.totalRevenue / totalRevenue) * 100)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="pagination-wrapper">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="btn-page"
                                        >
                                            Previous
                                        </button>
                                        <div className="page-info">Page {currentPage} of {totalPages}</div>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="btn-page"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="side-panels">
                    <div className="white-card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Top 10 Products</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>By total revenue contribution</p>
                        <div style={{ width: '100%', height: '320px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProducts} layout="vertical" margin={{ left: -20, right: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" hide />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)', padding: '12px' }}
                                        formatter={(val) => [`₹${val.toLocaleString()}`, 'Revenue']}
                                    />
                                    <Bar dataKey="totalRevenue" radius={[0, 6, 6, 0]} barSize={24}>
                                        {topProducts.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="white-card" style={{ marginTop: '24px', padding: '24px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '20px' }}>Revenue Distribution</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {topProducts.slice(0, 5).map((p, i) => (
                                <div key={p.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.name}</span>
                                        <span style={{ fontWeight: 800, color: COLORS[i % COLORS.length] }}>{Math.round((p.totalRevenue / totalRevenue) * 100)}%</span>
                                    </div>
                                    <div className="distribution-bar">
                                        <div style={{
                                            width: `${(p.totalRevenue / totalRevenue) * 100}%`,
                                            background: COLORS[i % COLORS.length]
                                        }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .page-header { display: flex; justify-content: space-between; align-items: flex-end; }
                .input-group-row { 
                    display: flex; align-items: center; gap: 8px; 
                    background: white; border: 1px solid var(--border-color); 
                    padding: 10px 14px; borderRadius: 12px; 
                }
                .input-group-row input { border: none; outline: none; font-size: 13px; color: var(--text-main); font-weight: 500; }
                
                .stat-mini { display: flex; align-items: center; gap: 20px; padding: 24px; border-radius: 20px; transition: transform 0.2s; }
                .stat-mini:hover { transform: translateY(-2px); }
                .stat-icon-box { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
                .stat-mini label { font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
                .stat-mini .value { font-size: 22px; font-weight: 800; color: var(--text-main); margin-top: 2px; }
                
                .select-box-mini { 
                    display: flex; align-items: center; gap: 8px; 
                    background: var(--bg-app); border: 1px solid var(--border-color); 
                    padding: 8px 14px; borderRadius: 10px; min-width: 200px;
                }
                .select-box-mini select { border: none; background: transparent; outline: none; font-size: 13px; flex: 1; color: var(--text-main); font-weight: 600; cursor: pointer; }
                
                .modern-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                .modern-table th { 
                    color: var(--text-muted); 
                    font-size: 11px; 
                    font-weight: 700; 
                    text-transform: uppercase; 
                    letter-spacing: 0.5px; 
                    padding: 16px; 
                    text-align: left;
                    border-bottom: 1px solid var(--border-color);
                }
                .modern-table td { 
                    padding: 16px; 
                    text-align: left;
                    border-bottom: 1px solid #f8fafc;
                    transition: background 0.2s;
                }
                .modern-table tr:hover td { background: #f8fafc; }
                
                .col-name { width: 40%; }
                .col-price { width: 15%; text-align: right !important; }
                .col-qty { width: 15%; text-align: right !important; }
                .col-revenue { width: 15%; text-align: right !important; }
                .col-trend { width: 15%; text-align: right !important; }

                .progress-bar-small { width: 60px; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; display: inline-block; }
                .progress-bar-small div { height: 100%; border-radius: 3px; }
                
                .distribution-bar { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
                .distribution-bar div { height: 100%; border-radius: 4px; }

                .pagination-wrapper { display: flex; align-items: center; justify-content: flex-end; gap: 16px; margin-top: 32px; padding-top: 24px; }
                .btn-page { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border-color); background: white; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .btn-page:hover:not(:disabled) { background: var(--bg-app); border-color: var(--accent); color: var(--accent); }
                .btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
                .page-info { font-size: 13px; color: var(--text-muted); font-weight: 500; }

                .spinner { width: 24px; height: 24px; border: 3px solid var(--border-color); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}} />
        </div>
    );
}
