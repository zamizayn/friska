import { useEffect, useState } from 'react';
import { Bike, Plus, Trash2, Edit3, X, Check } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function DeliveryBoys() {
    const [boys, setBoys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', phone: '', password: '' });

    const fetchBoys = async () => {
        try {
            const res = await fetch(`${API_ENDPOINTS.ORDERS}/../delivery-boys`, {
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setBoys(data);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => { fetchBoys(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editing
                ? `${API_ENDPOINTS.ORDERS}/../delivery-boys/${editing.id}`
                : `${API_ENDPOINTS.ORDERS}/../delivery-boys`;
            const method = editing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(editing ? { ...form, password: form.password || undefined } : form)
            });
            if (res.ok) {
                setForm({ name: '', phone: '', password: '' });
                setShowForm(false);
                setEditing(null);
                fetchBoys();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this delivery boy?')) return;
        try {
            await fetch(`${API_ENDPOINTS.ORDERS}/../delivery-boys/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            fetchBoys();
        } catch (e) {
            console.error(e);
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
                <button className="btn-primary" onClick={() => { setForm({ name: '', phone: '', password: '' }); setEditing(null); setShowForm(!showForm); }}>
                    <Plus size={16} /> {showForm ? 'Cancel' : 'Add Delivery Boy'}
                </button>
            </div>

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
