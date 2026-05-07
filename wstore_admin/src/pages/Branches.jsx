import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Shield, User, Lock, Store, Edit2, Clock } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Branches() {
    const [branches, setBranches] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', username: '', password: '', openingTime: '00:00', closingTime: '23:59' });
    const location = useLocation();
    const role = localStorage.getItem('adminRole');

    const format12Hour = (timeStr) => {
        if (!timeStr) return '12:00 AM';
        const [hour, minute] = timeStr.split(':');
        const h = parseInt(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${minute} ${ampm}`;
    };

    const fetchBranches = async () => {
        const res = await fetch(API_ENDPOINTS.BRANCHES, {
            headers: getHeaders()
        });
        const data = await res.json();
        setBranches(Array.isArray(data) ? data : []);
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('add') === 'true') {
            setModalOpen(true);
        }
    }, [location.search]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = formData.id ? `${API_ENDPOINTS.BRANCHES}/${formData.id}` : API_ENDPOINTS.BRANCHES;
        const method = formData.id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            setModalOpen(false);
            setFormData({ id: null, name: '', username: '', password: '', openingTime: '00:00', closingTime: '23:59' });
            fetchBranches();
        }
    };

    const openModal = (branch = null) => {
        if (branch) {
            setFormData({
                id: branch.id,
                name: branch.name,
                username: branch.username,
                password: '',
                openingTime: branch.openingTime || '00:00',
                closingTime: branch.closingTime || '23:59'
            });
        } else {
            setFormData({ id: null, name: '', username: '', password: '', openingTime: '00:00', closingTime: '23:59' });
        }
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? This will NOT delete sub-data but will orphan them.')) return;
        await fetch(`${API_ENDPOINTS.BRANCHES}/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        fetchBranches();
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>{role === 'branch' ? 'Hub Settings' : 'Branch Management'}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Manage physical locations and operational hours</p>
                </div>
                {role !== 'branch' && (
                    <button className="btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Add Branch
                    </button>
                )}
            </header>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {branches.map(branch => (
                    <div key={branch.id} className="white-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '48px', height: '48px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Store size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>{branch.name}</h3>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>#{branch.id}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-outline" style={{ padding: '8px' }} onClick={() => openModal(branch)}><Edit2 size={16} /></button>
                                {role !== 'branch' && (
                                    <button className="btn-outline" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => handleDelete(branch.id)}><Trash2 size={16} /></button>
                                )}
                            </div>
                        </div>

                        <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Username</span>
                                <span style={{ fontWeight: 700 }}>{branch.username}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Security Key</span>
                                <span style={{ fontWeight: 700 }}>••••••••</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontWeight: 700, fontSize: '14px' }}>
                            <Clock size={16} />
                            {format12Hour(branch.openingTime)} — {format12Hour(branch.closingTime)}
                        </div>
                    </div>
                ))}
            </div>

            {branches.length === 0 && (
                <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
                    <MapPin size={64} style={{ opacity: 0.1, marginBottom: '24px' }} />
                    <p>No branches have been created yet.</p>
                </div>
            )}

            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '500px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3>{formData.id ? 'Edit Branch' : 'New Branch'}</h3>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Branch Name</label>
                                <input type="text" placeholder="e.g. Main Street Outlet" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label>Login Username</label>
                                <input type="text" placeholder="branch_admin" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label>Password {formData.id && <span style={{ fontSize: '12px', opacity: 0.6 }}>(Leave blank to keep current)</span>}</label>
                                <input type="password" placeholder={formData.id ? "New password" : "Access password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!formData.id} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label>Opening Time</label>
                                    <input type="time" value={formData.openingTime} onChange={e => setFormData({ ...formData, openingTime: e.target.value })} required />
                                </div>
                                <div className="input-group">
                                    <label>Closing Time</label>
                                    <input type="time" value={formData.closingTime} onChange={e => setFormData({ ...formData, closingTime: e.target.value })} required />
                                </div>
                            </div>
                            <div className="modal-actions" style={{ gap: '12px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{formData.id ? 'Save Changes' : 'Create Branch'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
