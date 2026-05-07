import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Tag, IndianRupee, Calendar, Percent, CheckCircle2, XCircle, Info, Hash } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Offers() {
    const [offers, setOffers] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ 
        id: null, 
        code: '', 
        description: '', 
        discountType: 'flat', 
        discountValue: '', 
        minOrderValue: 0, 
        maxDiscount: '', 
        usageType: 'unlimited',
        startDate: '', 
        endDate: '', 
        isActive: true 
    });
    const navigate = useNavigate();

    const isAdmin = localStorage.getItem('adminRole') === 'superadmin';

    const fetchOffers = async () => {
        const branchId = localStorage.getItem('selectedBranchId') || localStorage.getItem('branchId') || '';
        const res = await fetch(`${API_ENDPOINTS.OFFERS}?branchId=${branchId}`, { headers: getHeaders() });
        if (res.status === 401) return navigate('/login');
        const data = await res.json();
        setOffers(data || []);
    };

    useEffect(() => {
        fetchOffers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = formData.id ? `${API_ENDPOINTS.OFFERS}/${formData.id}` : API_ENDPOINTS.OFFERS;
        const method = formData.id ? 'PUT' : 'POST';

        const body = { ...formData };
        const branchId = localStorage.getItem('selectedBranchId') || localStorage.getItem('branchId');
        
        if (!formData.id) {
            if (!branchId) {
                alert('Please select a branch first from the top menu.');
                return;
            }
            body.branchId = branchId;
        }

        // Clean up empty strings
        if (body.maxDiscount === '') delete body.maxDiscount;
        if (body.startDate === '') delete body.startDate;
        if (body.endDate === '') delete body.endDate;

        await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(body)
        });

        setModalOpen(false);
        fetchOffers();
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this offer?')) {
            await fetch(`${API_ENDPOINTS.OFFERS}/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            fetchOffers();
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setFormData({ 
                ...item,
                startDate: item.startDate ? item.startDate.split('T')[0] : '',
                endDate: item.endDate ? item.endDate.split('T')[0] : '',
                maxDiscount: item.maxDiscount || ''
            });
        } else {
            setFormData({ 
                id: null, 
                code: '', 
                description: '', 
                discountType: 'flat', 
                discountValue: '', 
                minOrderValue: 0, 
                maxDiscount: '', 
                usageType: 'unlimited',
                startDate: '', 
                endDate: '', 
                isActive: true 
            });
        }
        setModalOpen(true);
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Offers & Discounts</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Configure automatic discounts and promotional codes for this branch</p>
                </div>
                <button className="btn-primary" onClick={() => openModal()}>
                    <Plus size={18} /> Add New Rule
                </button>
            </header>

            <div className="white-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Offer Details</th>
                            <th>Threshold</th>
                            <th>Benefit</th>
                            <th>Usage</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {offers.map(offer => (
                            <tr key={offer.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'var(--accent-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                                            <Tag size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '15px' }}>{offer.code}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{offer.description || 'No description'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>
                                        {offer.minOrderValue > 0 ? `Orders > ₹${offer.minOrderValue}` : 'Any Order'}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '15px' }}>
                                        {offer.discountType === 'flat' ? `₹${offer.discountValue} OFF` : `${offer.discountValue}% OFF`}
                                        {offer.maxDiscount && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>Max ₹${offer.maxDiscount}</div>}
                                    </div>
                                </td>
                                <td>
                                    <span className={`status-pill ${offer.usageType === 'unlimited' ? 'success' : 'warning'}`} style={{ textTransform: 'capitalize' }}>
                                        {offer.usageType.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                        {offer.isActive ? (
                                            <><CheckCircle2 size={14} className="text-success" /> <span className="text-success">Active</span></>
                                        ) : (
                                            <><XCircle size={14} className="text-danger" /> <span className="text-danger">Paused</span></>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button className="btn-outline" style={{ padding: '8px' }} onClick={() => openModal(offer)} title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="btn-outline" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => handleDelete(offer.id)} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {offers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                        <Tag size={64} style={{ opacity: 0.1, marginBottom: '24px' }} />
                        <h3>No offers configured yet</h3>
                        <p>Create your first discount rule to boost sales!</p>
                    </div>
                )}
            </div>

            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '600px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3>{formData.id ? 'Edit Discount Rule' : 'New Discount Rule'}</h3>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Offer Code (e.g. WELCOME50, THRESHOLD_DISCOUNT)</label>
                                <div className="input-with-icon">
                                    <Hash size={16} className="field-icon" />
                                    <input type="text" placeholder="CODE123" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Short Description</label>
                                <input type="text" placeholder="e.g. Save ₹50 on orders above ₹500" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <div className="input-group">
                                    <label>Discount Type</label>
                                    <select value={formData.discountType} onChange={e => setFormData({ ...formData, discountType: e.target.value })}>
                                        <option value="flat">Flat Amount (₹)</option>
                                        <option value="percentage">Percentage (%)</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Discount Value</label>
                                    <div className="input-with-icon">
                                        {formData.discountType === 'flat' ? <IndianRupee size={16} className="field-icon" /> : <Percent size={16} className="field-icon" />}
                                        <input type="number" placeholder="0" value={formData.discountValue} onChange={e => setFormData({ ...formData, discountValue: e.target.value })} required />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <div className="input-group">
                                    <label>Min. Order Value (₹)</label>
                                    <input type="number" placeholder="0" value={formData.minOrderValue} onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Max Discount (₹) {formData.discountType === 'flat' && <span style={{fontSize: '10px', opacity: 0.5}}>(Optional)</span>}</label>
                                    <input type="number" placeholder="Unlimited" value={formData.maxDiscount} onChange={e => setFormData({ ...formData, maxDiscount: e.target.value })} />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Usage Limit</label>
                                <select value={formData.usageType} onChange={e => setFormData({ ...formData, usageType: e.target.value })}>
                                    <option value="unlimited">Unlimited Use</option>
                                    <option value="first_order_only">First Order Only</option>
                                    <option value="once_per_customer">Once Per Customer</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <div className="input-group">
                                    <label>Start Date (Optional)</label>
                                    <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>End Date (Optional)</label>
                                    <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                                <input 
                                    type="checkbox" 
                                    id="isActive" 
                                    checked={formData.isActive} 
                                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                />
                                <label htmlFor="isActive" style={{ cursor: 'pointer', fontWeight: 600 }}>Active and currently available for customers</label>
                            </div>

                            <div className="modal-actions" style={{ gap: '12px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{formData.id ? 'Save Rule' : 'Create Rule'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
