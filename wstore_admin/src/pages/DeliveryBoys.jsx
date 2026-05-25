import { useEffect, useState } from 'react';
import { Bike, Plus, Trash2, Edit3, Check } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function DeliveryBoys() {
    const [boys, setBoys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', phone: '', password: '' });

    const fetchBoys = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(API_ENDPOINTS.DELIVERY_BOYS, { headers: getHeaders() });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Server error (${res.status})`);
            }
            const data = await res.json();
            setBoys(data);
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    useEffect(() => { fetchBoys(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const url = editing
                ? `${API_ENDPOINTS.DELIVERY_BOYS}/${editing.id}`
                : API_ENDPOINTS.DELIVERY_BOYS;
            const method = editing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(editing ? { ...form, password: form.password || undefined } : form)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Server error (${res.status})`);
            }
            setForm({ name: '', phone: '', password: '' });
            setShowForm(false);
            setEditing(null);
            fetchBoys();
        } catch (e) {
            setError(e.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this delivery boy?')) return;
        setError(null);
        try {
            const res = await fetch(`${API_ENDPOINTS.DELIVERY_BOYS}/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Server error (${res.status})`);
            }
            fetchBoys();
        } catch (e) {
            setError(e.message);
        }
    };

    const startEdit = (boy) => {
        setForm({ name: boy.name, phone: boy.phone, password: '' });
        setEditing(boy);
        setShowForm(true);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bike size={24} /> Delivery Boys
                </h2>
                <button className="btn-primary" onClick={() => { setError(null); setForm({ name: '', phone: '', password: '' }); setEditing(null); setShowForm(!showForm); }}>
                    <Plus size={16} /> {showForm ? 'Cancel' : 'Add Delivery Boy'}
                </button>
            </div>

            {error && (
                <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', fontWeight: 600, border: '1px solid #fecaca' }}>
                    {error}
                </div>
            )}

            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                    <div className="input-group">
                        <label>Name</label>
                        <input type="text" placeholder="Delivery boy name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="input-group">
                        <label>Phone</label>
                        <input type="tel" placeholder="Phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
                    </div>
                    <div className="input-group">
                        <label>{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
                        <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editing} />
                    </div>
                    <button className="btn-primary" type="submit" style={{ alignSelf: 'flex-start' }}>
                        <Check size={16} /> {editing ? 'Update' : 'Create'}
                    </button>
                </form>
            )}

            {loading ? (
                <p>Loading...</p>
            ) : boys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <Bike size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <p>No delivery boys yet. Add one to get started.</p>
                </div>
            ) : (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Branch</th>
                                <th>Status</th>
                                <th style={{ width: '120px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {boys.map(boy => (
                                <tr key={boy.id}>
                                    <td style={{ fontWeight: 600 }}>{boy.name}</td>
                                    <td>{boy.phone}</td>
                                    <td>{boy.branch?.name || '—'}</td>
                                    <td>
                                        <span className={`status-pill ${boy.status === 'active' ? 'success' : 'error'}`}>
                                            {boy.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn-outline" style={{ padding: '6px' }} onClick={() => startEdit(boy)}>
                                                <Edit3 size={14} />
                                            </button>
                                            <button className="btn-outline" style={{ padding: '6px', color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => handleDelete(boy.id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
