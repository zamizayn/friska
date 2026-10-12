import { useEffect, useState } from 'react';
import { Settings, Save, Phone, IndianRupee, Loader2, Globe, MessageSquare, Rocket } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function PlatformSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [configs, setConfigs] = useState({
        registrationFee: '',
        superAdminWhatsApp: '',
        launched: 'true',
        launchedMessage: ''
    });
    // The launch switch is stored as the strings 'true' / 'false'; anything but 'false' means launched
    const isLaunched = String(configs.launched ?? 'true').trim().toLowerCase() !== 'false';

    useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const res = await fetch(API_ENDPOINTS.GLOBAL_CONFIGS, {
                    headers: getHeaders()
                });
                const data = await res.json();
                setConfigs(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchConfigs();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(API_ENDPOINTS.GLOBAL_CONFIGS, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(configs)
            });
            if (res.ok) {
                alert('Platform settings updated successfully');
            } else {
                alert('Failed to update settings');
            }
        } catch (e) {
            alert('Connection error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 className="animate-spin text-accent" size={32} />
            </div>
        );
    }

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Platform Settings</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Global configurations for the Friska platform</p>
                </div>
            </header>

            <div style={{ maxWidth: '800px' }}>
                <form onSubmit={handleSave}>
                    <div className="white-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                            <IndianRupee size={20} className="text-accent" />
                            Onboarding & Fees
                        </h3>

                        <div className="input-group">
                            <label>One-time Registration Fee (₹)</label>
                            <input 
                                type="number" 
                                placeholder="1000" 
                                value={configs.registrationFee} 
                                onChange={e => setConfigs({ ...configs, registrationFee: e.target.value })} 
                                required
                            />
                            <p className="input-help">Amount in INR that new tenants must pay to activate their account.</p>
                        </div>
                    </div>

                    <div className="white-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                                <Rocket size={20} className="text-accent" />
                                Shop Launch
                            </h3>
                            <span className={`status-pill ${isLaunched ? 'success' : 'warning'}`}>{isLaunched ? 'Launched' : 'Not launched'}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                id="launched"
                                checked={isLaunched}
                                onChange={e => setConfigs({ ...configs, launched: e.target.checked ? 'true' : 'false' })}
                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                            />
                            <label htmlFor="launched" style={{ cursor: 'pointer', fontWeight: 600 }}>Shops are open for customers</label>
                        </div>
                        <p className="input-help" style={{ marginLeft: '30px' }}>
                            {isLaunched
                                ? 'Customers can browse and order on WhatsApp and the web catalog.'
                                : 'Shops are treated as closed. When a customer says Hi, or tries to browse or order, they get the message below instead.'}
                        </p>

                        {!isLaunched && (
                            <div className="input-group" style={{ marginTop: '24px', marginBottom: 0 }}>
                                <label>Message customers see</label>
                                <textarea
                                    style={{ height: '110px' }}
                                    placeholder="We're currently preparing for launch! 🚀 Orders are not yet available. Please check back with us soon!"
                                    value={configs.launchedMessage || ''}
                                    onChange={e => setConfigs({ ...configs, launchedMessage: e.target.value })}
                                />
                                <p className="input-help">Leave it blank to use the default message shown above.</p>
                            </div>
                        )}
                    </div>

                    <div className="white-card" style={{ padding: '32px', marginBottom: '32px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                            <MessageSquare size={20} className="text-accent" />
                            Support Channel
                        </h3>

                        <div className="input-group">
                            <label>Super Admin WhatsApp Number</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                                <input 
                                    type="text" 
                                    style={{ paddingLeft: '44px' }}
                                    placeholder="919876543210" 
                                    value={configs.superAdminWhatsApp} 
                                    onChange={e => setConfigs({ ...configs, superAdminWhatsApp: e.target.value })} 
                                    required
                                />
                            </div>
                            <p className="input-help">The WhatsApp number (with country code) where tenants will be redirected for support.</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Settings</>}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .input-help {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-top: 8px;
                }
                .text-accent { color: var(--accent); }
            `}</style>
        </div>
    );
}
