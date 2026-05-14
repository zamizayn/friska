import { useEffect, useState } from 'react';
import { Save, ShieldCheck, Globe, Key, AlertCircle, Sparkles, Phone } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Settings() {
    const [formData, setFormData] = useState({
        razorpayKeyId: '',
        razorpayKeySecret: '',
        razorpayWebhookSecret: '',
        googleMapsApiKey: '',
        geminiApiKey: '',
        storePhone: ''
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
                        razorpayWebhookSecret: data.razorpayWebhookSecret || '',
                        googleMapsApiKey: data.googleMapsApiKey || '',
                        geminiApiKey: data.geminiApiKey || '',
                        storePhone: data.storePhone || ''
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
                            <div style={{ width: '40px', height: '40px', background: '#eff6ff', color: '#3b82f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Globe size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0 }}>Google Maps Integration</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Configure your maps API key for location services</p>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Key size={14} /> Google Maps API Key
                            </label>
                            <input
                                type="text"
                                placeholder="AIzaSy..."
                                value={formData.googleMapsApiKey}
                                onChange={e => setFormData({ ...formData, googleMapsApiKey: e.target.value })}
                                style={{ background: 'var(--bg-app)' }}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>This key is used for customer address selection and delivery distance calculations.</p>
                        </div>
                    </div>

                    <div className="white-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ width: '40px', height: '40px', background: '#f5f3ff', color: '#8b5cf6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0 }}>WhatsApp & AI Integration</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Configure your public WhatsApp number and AI assistant</p>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Phone size={14} /> Store WhatsApp Number
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., 917012738756"
                                value={formData.storePhone}
                                onChange={e => setFormData({ ...formData, storePhone: e.target.value })}
                                style={{ background: 'var(--bg-app)' }}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>This is the number customers will use to place orders via the catalog. Include country code without +.</p>
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Key size={14} /> Gemini API Key
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your Gemini API key"
                                value={formData.geminiApiKey}
                                onChange={e => setFormData({ ...formData, geminiApiKey: e.target.value })}
                                style={{ background: 'var(--bg-app)' }}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Get your API key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Google AI Studio</a>. This enables the AI support bot on WhatsApp.</p>
                        </div>
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
