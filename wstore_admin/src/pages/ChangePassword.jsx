import { useState } from 'react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';
import { Lock, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ChangePassword() {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (formData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                })
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to change password' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'A network error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
            <div className="page-header" style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '8px' }}>Security Settings</h1>
                <p style={{ color: 'var(--text-muted)' }}>Protect your account by regularly updating your password.</p>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '32px', boxShadow: 'var(--shadow-sm)' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>Current Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                className="form-input"
                                style={{ paddingLeft: '40px', width: '100%', borderRadius: '10px', border: '1px solid var(--border-color)', height: '48px' }}
                                value={formData.currentPassword}
                                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                placeholder="Enter current password"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>New Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                className="form-input"
                                style={{ paddingLeft: '40px', width: '100%', borderRadius: '10px', border: '1px solid var(--border-color)', height: '48px' }}
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                placeholder="Enter new password"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>Confirm New Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                className="form-input"
                                style={{ paddingLeft: '40px', width: '100%', borderRadius: '10px', border: '1px solid var(--border-color)', height: '48px' }}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                placeholder="Repeat new password"
                                required
                            />
                        </div>
                    </div>

                    {message.text && (
                        <div style={{ 
                            padding: '16px', 
                            borderRadius: '12px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            fontSize: '14px',
                            backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
                            color: message.type === 'error' ? '#991b1b' : '#166534',
                            border: `1px solid ${message.type === 'error' ? '#fee2e2' : '#dcfce7'}`
                        }}>
                            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{ 
                            height: '48px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '10px', 
                            fontSize: '15px', 
                            fontWeight: 600,
                            marginTop: '8px'
                        }}
                    >
                        {loading ? 'Updating...' : <><Save size={18} /> Update Password</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
