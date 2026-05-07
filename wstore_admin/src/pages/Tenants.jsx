import { useEffect, useState } from 'react';
import { Plus, Trash2, Building2, Globe, Key, Phone, Settings2, Edit, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Tenants() {
    const [tenants, setTenants] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phoneNumberId: '',
        whatsappToken: '',
        wabaId: '',
        username: '',
        password: '',
        catalogId: '',
        isActive: true
    });
    const [editingId, setEditingId] = useState(null);
    const navigate = useNavigate();

    const fetchTenants = async () => {
        const res = await fetch(API_ENDPOINTS.TENANTS, {
            headers: getHeaders()
        });
        const data = await res.json();
        setTenants(data);
    };

    useEffect(() => { fetchTenants(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingId ? `${API_ENDPOINTS.TENANTS}/${editingId}` : API_ENDPOINTS.TENANTS;
        const method = editingId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            setModalOpen(false);
            setEditingId(null);
            setFormData({ name: '', phoneNumberId: '', whatsappToken: '', wabaId: '', username: '', password: '', catalogId: '', isActive: true });
            fetchTenants();
        }
    };

    const handleEdit = (tenant) => {
        setEditingId(tenant.id);
        setFormData({
            name: tenant.name,
            phoneNumberId: tenant.phoneNumberId || '',
            whatsappToken: tenant.whatsappToken || '',
            wabaId: tenant.wabaId || '',
            username: tenant.username || '',
            password: '', // Don't pre-fill password for security
            catalogId: tenant.catalogId || '',
            isActive: tenant.isActive
        });
        setModalOpen(true);
    };

    const handleEnableWebhooks = async (id) => {
        if (!confirm('Are you sure you want to enable webhooks for this tenant? This will subscribe the WhatsApp account to your WStore app on Meta.')) return;

        try {
            const res = await fetch(`${API_ENDPOINTS.TENANTS}/${id}/enable-webhooks`, {
                method: 'POST',
                headers: getHeaders()
            });
            const data = await res.json();
            if (res.ok) {
                alert('Webhooks successfully enabled!');
                fetchTenants();
            } else {
                alert('Error: ' + (data.error || 'Failed to enable webhooks'));
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this tenant? This will effectively disable all associated branches.')) return;
        await fetch(`${API_ENDPOINTS.TENANTS}/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        fetchTenants();
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Platform Tenants</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Manage business accounts and WhatsApp configurations</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* <button className="btn-outline" onClick={() => navigate('/admin/onboard-wizard')}>
                        <Settings2 size={18} /> Launch Wizard
                    </button> */}
                    <button className="btn-primary" onClick={() => { setEditingId(null); setModalOpen(true); }}>
                        <Plus size={18} /> Add Tenant
                    </button>
                </div>
            </header>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                {tenants.map(tenant => (
                    <div key={tenant.id} className="white-card" style={{ padding: '24px', opacity: tenant.isActive ? 1 : 0.7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '48px', height: '48px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>{tenant.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                        <span className={`status-pill ${tenant.isActive ? 'success' : 'warning'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                            {tenant.isActive ? 'ACTIVE' : 'DISABLED'}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: #{tenant.id}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-outline" style={{ padding: '8px' }} onClick={() => handleEdit(tenant)} title="Edit"><Edit size={16} /></button>
                                <button className="btn-outline" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => handleDelete(tenant.id)} title="Delete"><Trash2 size={16} /></button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '12px' }}>
                                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Phone ID</p>
                                <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tenant.phoneNumberId || '—'}</p>
                            </div>
                            <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '12px' }}>
                                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>WABA ID</p>
                                <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tenant.wabaId || '—'}</p>
                            </div>
                        </div>

                        <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '12px', marginBottom: '24px' }}>
                            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Meta Access Token</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Key size={14} style={{ color: 'var(--text-muted)' }} />
                                <p style={{ fontSize: '13px', fontWeight: 600 }}>{tenant.whatsappToken ? '••••••••••••••••' : 'Not Configured'}</p>
                            </div>
                        </div>

                        {tenant.isActive && tenant.wabaId && (
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', justifyContent: 'center' }}>
                                {tenant.webhooksEnabled ? (
                                    <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckCircle2 size={16} /> Webhooks Subscribed
                                    </div>
                                ) : (
                                    <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--success)' }} onClick={() => handleEnableWebhooks(tenant.id)}>
                                        <Globe size={16} /> Enable Meta Webhooks
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {tenants.length === 0 && (
                <div className="white-card" style={{ textAlign: 'center', padding: '80px 0' }}>
                    <Building2 size={64} style={{ color: 'var(--text-muted)', opacity: 0.2, marginBottom: '24px' }} />
                    <h2>No tenants found</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Start by onboarding your first business account.</p>
                    <button className="btn-primary" style={{ margin: '0 auto' }} onClick={() => setModalOpen(true)}>Add New Tenant</button>
                </div>
            )}

            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '540px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3>{editingId ? 'Edit Tenant' : 'New Tenant'}</h3>
                            <button className="btn-outline" style={{ padding: '4px', border: 'none' }} onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Business Name</label>
                                <input type="text" placeholder="e.g. Aventus Informatics" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label>Meta Phone ID</label>
                                    <input type="text" value={formData.phoneNumberId} onChange={e => setFormData({ ...formData, phoneNumberId: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Meta WABA ID</label>
                                    <input type="text" value={formData.wabaId} onChange={e => setFormData({ ...formData, wabaId: e.target.value })} />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Meta Access Token</label>
                                <input type="password" value={formData.whatsappToken} onChange={e => setFormData({ ...formData, whatsappToken: e.target.value })} />
                            </div>

                            <div className="input-group">
                                <label>Meta Catalog ID (Optional)</label>
                                <input type="text" value={formData.catalogId} onChange={e => setFormData({ ...formData, catalogId: e.target.value })} />
                            </div>

                            <div style={{ padding: '20px', background: 'var(--accent-light)', borderRadius: '16px', marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '13px', color: 'var(--accent)', marginBottom: '16px' }}>Admin Credentials</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Username</label>
                                        <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Password</label>
                                        <input type="password" placeholder={editingId ? 'Leave blank to keep current' : '••••••••'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                                <input type="checkbox" id="tenantActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                <label htmlFor="tenantActive" style={{ marginBottom: 0, fontWeight: 500 }}>Active and enabled</label>
                            </div>

                            <div className="modal-actions" style={{ gap: '12px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{editingId ? 'Save Changes' : 'Create Tenant'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
