import { useEffect, useState } from 'react';
import { CreditCard, Save, ShieldCheck, Globe, Key, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Settings() {
    const [formData, setFormData] = useState({
        razorpayKeyId: '',
        razorpayKeySecret: '',
        razorpayWebhookSecret: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const tenantId = localStorage.getItem('tenantId');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_ENDPOINTS.TENANTS}/me/settings`, {
                    headers: getHeaders()
                });
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        razorpayKeyId: data.razorpayKeyId || '',
                        razorpayKeySecret: data.razorpayKeySecret || '',
                        razorpayWebhookSecret: data.razorpayWebhookSecret || ''
                    });
                }
            } catch (e) {
                console.error('Failed to fetch settings:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_ENDPOINTS.TENANTS}/me/settings`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Settings updated successfully! ✨' });
            } else {
                setMessage({ type: 'error', text: 'Failed to update settings. Please try again.' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    const webhookUrl = `${window.location.origin.replace('admin.', '')}/api/payments/webhook/${tenantId || 'YOUR_TENANT_ID'}`;

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Store Settings</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Configure your store's global integrations and preferences</p>
                </div>
            </header>

            <div style={{ maxWidth: '800px' }}>
                {message && (
                    <div style={{ 
                        padding: '16px 20px', 
                        borderRadius: '12px', 
                        marginBottom: '24px', 
                        background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        color: message.type === 'success' ? '#059669' : '#dc2626',
                        border: `1px solid ${message.type === 'success' ? '#10b981' : '#f87171'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '14px',
                        fontWeight: 600
                    }}>
                        {message.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="white-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ width: '40px', height: '40px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0 }}>Razorpay Integration</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Configure your online payment gateway credentials</p>
                            </div>
                        </div>

                        <div className="input-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Key size={14} /> Razorpay Key ID
                            </label>
                            <input 
                                type="text" 
                                placeholder="rzp_live_..." 
                                value={formData.razorpayKeyId} 
                                onChange={e => setFormData({ ...formData, razorpayKeyId: e.target.value })} 
                                style={{ background: 'var(--bg-app)' }}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Get this from your Razorpay Dashboard &gt; Settings &gt; API Keys</p>
                        </div>

                        <div className="input-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck size={14} /> Razorpay Key Secret
                            </label>
                            <input 
                                type="password" 
                                placeholder="••••••••••••••••" 
                                value={formData.razorpayKeySecret} 
                                onChange={e => setFormData({ ...formData, razorpayKeySecret: e.target.value })} 
                                style={{ background: 'var(--bg-app)' }}
                            />
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Globe size={14} /> Webhook Secret
                            </label>
                            <input 
                                type="password" 
                                placeholder="••••••••••••••••" 
                                value={formData.razorpayWebhookSecret} 
                                onChange={e => setFormData({ ...formData, razorpayWebhookSecret: e.target.value })} 
                                style={{ background: 'var(--bg-app)' }}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Set this secret in your Razorpay Webhook settings to verify payment notifications.</p>
                        </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px dashed var(--border-color)', marginBottom: '32px' }}>
                        <h4 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Globe size={16} /> Webhook Configuration
                        </h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                            To receive automatic payment updates, add a webhook in your Razorpay dashboard with the following URL:
                            <br />
                            <code style={{ background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'block', marginTop: '12px', color: 'var(--accent)', fontWeight: 600, fontSize: '12px', wordBreak: 'break-all' }}>
                                {webhookUrl}
                            </code>
                            <br />
                            Select <b>payment_link.paid</b> as the active event.
                        </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn-primary" style={{ padding: '12px 32px' }} disabled={saving}>
                            {saving ? 'Saving Changes...' : <><Save size={18} /> Save Settings</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
