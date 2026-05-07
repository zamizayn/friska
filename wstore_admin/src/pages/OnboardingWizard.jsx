import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Globe, Phone, Key, Store, CheckCircle, ArrowRight, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function OnboardingWizard() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [tenantData, setTenantData] = useState({
        name: '',
        phoneNumberId: '',
        whatsappToken: '',
        wabaId: '',
        username: '',
        password: ''
    });

    const [branchData, setBranchData] = useState({
        name: '',
        username: '',
        password: ''
    });

    const [createdTenant, setCreatedTenant] = useState(null);

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleTenantSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(API_ENDPOINTS.TENANTS, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(tenantData)
            });
            const data = await res.json();
            if (res.ok) {
                setCreatedTenant(data);
                nextStep();
            } else {
                setError(data.error || 'Failed to create tenant');
            }
        } catch (e) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const handleBranchSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(API_ENDPOINTS.BRANCHES, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ ...branchData, tenantId: createdTenant.id })
            });
            if (res.ok) {
                alert('Onboarding Complete! You can now login with your credentials.');
                navigate('/login');
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create branch');
            }
        } catch (e) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="onboarding-card animate-fade-in">
                        <div className="wizard-header">
                            <div className="icon-badge"><Building2 size={32} /></div>
                            <h2>Welcome! Let's start with your Business</h2>
                            <p>Enter the primary name of the business tenant you're onboarding.</p>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
                            <div className="input-group">
                                <label>Business Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Starbucks India"
                                    value={tenantData.name}
                                    onChange={e => setTenantData({ ...tenantData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn-primary w-full py-4">
                                Continue to Meta Integration <ArrowRight size={18} />
                            </button>
                        </form>
                    </div>
                );
            case 2:
                return (
                    <div className="onboarding-card animate-fade-in">
                        <div className="wizard-header">
                            <div className="icon-badge"><Globe size={32} /></div>
                            <h2>WhatsApp Meta Integration</h2>
                            <p>Configure the WhatsApp Business API details for this tenant.</p>
                        </div>
                        <form onSubmit={handleTenantSubmit}>
                            <div className="input-group">
                                <label>Meta Phone Number ID</label>
                                <div className="input-with-icon">
                                    <Phone size={18} />
                                    <input
                                        type="text"
                                        placeholder="1092..."
                                        value={tenantData.phoneNumberId}
                                        onChange={e => setTenantData({ ...tenantData, phoneNumberId: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Meta System User Access Token</label>
                                <div className="input-with-icon">
                                    <Key size={18} />
                                    <input
                                        type="password"
                                        placeholder="EAAl..."
                                        value={tenantData.whatsappToken}
                                        onChange={e => setTenantData({ ...tenantData, whatsappToken: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>WABA ID (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Business Account ID"
                                    value={tenantData.wabaId}
                                    onChange={e => setTenantData({ ...tenantData, wabaId: e.target.value })}
                                />
                            </div>

                            <div style={{ padding: '20px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '16px', marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--accent)' }}>Tenant Admin Account</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Admin Username</label>
                                        <input
                                            type="text"
                                            placeholder="tenant_admin"
                                            value={tenantData.username}
                                            onChange={e => setTenantData({ ...tenantData, username: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                        <label>Admin Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={tenantData.password}
                                            onChange={e => setTenantData({ ...tenantData, password: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            {error && <div className="alert-error">{error}</div>}
                            <div className="footer-actions">
                                <button type="button" className="btn-outline" onClick={prevStep}>Back</button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : 'Provision Tenant'}
                                </button>
                            </div>
                        </form>
                    </div>
                );
            case 3:
                return (
                    <div className="onboarding-card animate-fade-in">
                        <div className="wizard-header">
                            <div className="icon-badge"><Store size={32} /></div>
                            <h2>Create Your First Branch</h2>
                            <p>Now let's setup the first hub for <strong>{tenantData.name}</strong>.</p>
                        </div>
                        <form onSubmit={handleBranchSubmit}>
                            <div className="input-group">
                                <label>Branch Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mumbai BKC"
                                    value={branchData.name}
                                    onChange={e => setBranchData({ ...branchData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label>Admin Username</label>
                                    <input
                                        type="text"
                                        placeholder="bkc_admin"
                                        value={branchData.username}
                                        onChange={e => setBranchData({ ...branchData, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Admin Password</label>
                                    <input
                                        type="password"
                                        value={branchData.password}
                                        onChange={e => setBranchData({ ...branchData, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            {error && <div className="alert-error">{error}</div>}
                            <div className="footer-actions">
                                <button type="submit" className="btn-primary w-full py-4" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : 'Complete Setup & Launch 🚀'}
                                </button>
                            </div>
                        </form>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="onboarding-guide-page premium-dark">
            <div className="guide-background-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2" style={{ background: '#6366f1' }}></div>
            </div>

            <div className="wizard-viewport-centered">
                <div className="wizard-progress-minimal">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`step-dot-indicator ${step >= s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
                            {step > s ? <CheckCircle size={16} /> : s}
                        </div>
                    ))}
                </div>
                
                <div className="wizard-container-compact">
                    {renderStep()}
                </div>
            </div>

            <style>{`
                .onboarding-guide-page.premium-dark {
                    background: #05060a;
                    min-height: 100vh;
                    position: relative;
                    overflow-x: hidden;
                }
                .wizard-viewport-centered {
                    position: relative;
                    z-index: 2;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                }
                .wizard-progress-minimal {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 30px;
                }
                .step-dot-indicator {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    color: #94a3b8;
                    transition: all 0.3s;
                }
                .step-dot-indicator.active {
                    background: #6366f1;
                    color: white;
                    border-color: #6366f1;
                    box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
                }
                .step-dot-indicator.completed {
                    background: rgba(99, 102, 241, 0.2);
                    color: #6366f1;
                    border-color: rgba(99, 102, 241, 0.3);
                }
                .wizard-container-compact {
                    width: 100%;
                    max-width: 540px;
                }
                .onboarding-card {
                    background: rgba(15, 17, 26, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 48px;
                    border-radius: 28px;
                    box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.5);
                }
                .wizard-header {
                    text-align: center;
                    margin-bottom: 40px;
                }
                .icon-badge {
                    width: 70px;
                    height: 70px;
                    background: rgba(99, 102, 241, 0.1);
                    color: #6366f1;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                }
                .wizard-header h2 {
                    font-size: 28px;
                    font-weight: 800;
                    color: #fff;
                    margin-bottom: 12px;
                    letter-spacing: -0.5px;
                }
                .wizard-header p {
                    color: #94a3b8;
                    font-size: 15px;
                    line-height: 1.5;
                }
                .input-group label {
                    color: #94a3b8;
                    font-size: 13px;
                    font-weight: 600;
                    margin-bottom: 8px;
                    display: block;
                }
                .input-group input, .input-with-icon input {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    border-radius: 12px;
                    padding: 14px;
                    width: 100%;
                    transition: all 0.3s;
                }
                .input-group input:focus, .input-with-icon input:focus {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: #6366f1;
                    outline: none;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                }
                .input-with-icon svg {
                    position: absolute;
                    left: 14px;
                    top: 15px;
                    color: #6366f1;
                }
                .input-with-icon input {
                    padding-left: 44px;
                }
                .btn-primary {
                    background: linear-gradient(135deg, #6366f1, #a855f7);
                    border: none;
                    color: #fff;
                    font-weight: 700;
                    padding: 16px;
                    border-radius: 14px;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.5);
                }
                .btn-outline {
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #94a3b8;
                    padding: 16px;
                    border-radius: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .btn-outline:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                }
                .alert-error {
                    background: rgba(239, 68, 68, 0.1);
                    color: #f87171;
                    padding: 14px;
                    border-radius: 12px;
                    font-size: 14px;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    margin-bottom: 20px;
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Reuse guide blobs */
                .guide-background-blobs {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    z-index: 1;
                    pointer-events: none;
                    overflow: hidden;
                }
                .blob {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.15;
                }
                .blob-1 {
                    width: 600px;
                    height: 600px;
                    background: #6366f1;
                    top: -200px;
                    left: -200px;
                }
                .blob-2 {
                    width: 500px;
                    height: 500px;
                    background: #a855f7;
                    bottom: -150px;
                    right: -150px;
                }
            `}</style>
        </div>
    );
}
