import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle, MessageSquare, ArrowRight, Loader2, ShieldCheck, HelpCircle } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function RegistrationPayment() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tenantId = searchParams.get('tenantId');
    
    const [status, setStatus] = useState('loading'); // loading, unpaid, paid
    const [tenant, setTenant] = useState(null);
    const [configs, setConfigs] = useState({});
    const [paymentLoading, setPaymentLoading] = useState(false);

    useEffect(() => {
        if (!tenantId) {
            navigate('/onboard-wizard');
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch tenant status
                const resStatus = await fetch(API_ENDPOINTS.REGISTRATION_STATUS(tenantId));
                const dataStatus = await resStatus.json();
                
                if (dataStatus.paymentStatus === 'paid') {
                    setStatus('paid');
                    setTenant(dataStatus);
                } else {
                    setStatus('unpaid');
                    setTenant(dataStatus);
                }

                // Fetch global configs for fee and whatsapp
                const resConfig = await fetch(API_ENDPOINTS.GLOBAL_CONFIGS);
                const dataConfig = await resConfig.json();
                setConfigs(dataConfig);

            } catch (e) {
                console.error(e);
            }
        };

        fetchData();

        // Polling for status if unpaid
        const interval = setInterval(async () => {
            if (status === 'unpaid') {
                const res = await fetch(API_ENDPOINTS.REGISTRATION_STATUS(tenantId));
                const data = await res.json();
                if (data.paymentStatus === 'paid') {
                    setStatus('paid');
                    clearInterval(interval);
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [tenantId, status]);

    const handlePay = async () => {
        setPaymentLoading(true);
        try {
            const res = await fetch(API_ENDPOINTS.REGISTRATION_PAYMENT, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ tenantId })
            });
            const data = await res.json();
            if (data.url) {
                window.open(data.url, '_blank');
            }
        } catch (e) {
            alert('Error creating payment link');
        } finally {
            setPaymentLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="onboarding-guide-page premium-dark flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={48} />
            </div>
        );
    }

    return (
        <div className="onboarding-guide-page premium-dark">
            <div className="guide-background-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>

            <div className="wizard-viewport-centered">
                <div className="wizard-container-compact">
                    {status === 'unpaid' ? (
                        <div className="onboarding-card animate-fade-in">
                            <div className="wizard-header">
                                <div className="icon-badge"><CreditCard size={32} /></div>
                                <h2>Complete Registration</h2>
                                <p>To finalize <strong>{tenant?.name}</strong>, please complete the one-time registration payment.</p>
                            </div>

                            <div className="payment-summary-card">
                                <div className="summary-row">
                                    <span>One-time Registration Fee</span>
                                    <span className="amount">₹{configs.registrationFee || '1000'}</span>
                                </div>
                                <div className="summary-row total">
                                    <span>Total Payable</span>
                                    <span className="amount">₹{configs.registrationFee || '1000'}</span>
                                </div>
                            </div>

                            <div className="security-badges">
                                <div className="badge">
                                    <ShieldCheck size={16} /> <span>Secure Payment via Razorpay</span>
                                </div>
                                <div className="badge">
                                    <CheckCircle size={16} /> <span>Instant Activation</span>
                                </div>
                            </div>

                            <button onClick={handlePay} className="btn-primary w-full py-4 mb-4" disabled={paymentLoading}>
                                {paymentLoading ? <Loader2 className="animate-spin" /> : <>Pay Now & Activate <ArrowRight size={18} /></>}
                            </button>

                            <p className="text-center text-xs text-muted">
                                You will be redirected to Razorpay to complete the payment. 
                                After payment, this page will automatically update.
                            </p>
                        </div>
                    ) : (
                        <div className="onboarding-card animate-fade-in text-center">
                            <div className="success-lottie">
                                <CheckCircle size={80} className="text-success" style={{ margin: '0 auto 24px', color: '#10b981' }} />
                            </div>
                            <h2>Payment Successful!</h2>
                            <p style={{ marginBottom: '32px' }}>Your business <strong>{tenant?.name}</strong> is now registered on the platform.</p>
                            
                            <div className="action-grid">
                                <button onClick={() => navigate('/onboarding-steps')} className="btn-primary w-full py-4 mb-4">
                                    Proceed to Setup Guide <ArrowRight size={18} />
                                </button>
                                
                                <button 
                                    onClick={() => window.open(`https://wa.me/${configs.superAdminWhatsApp || '919876543210'}`, '_blank')} 
                                    className="btn-outline w-full py-4 flex items-center justify-center gap-2"
                                    style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#25d366', borderColor: 'rgba(37, 211, 102, 0.2)' }}
                                >
                                    <MessageSquare size={18} /> Chat with Support
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .onboarding-guide-page.premium-dark {
                    background: #05060a;
                    min-height: 100vh;
                    position: relative;
                    overflow-x: hidden;
                    color: white;
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
                .payment-summary-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 24px;
                }
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    color: #94a3b8;
                    font-size: 14px;
                    margin-bottom: 12px;
                }
                .summary-row.total {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    font-weight: 700;
                    font-size: 18px;
                }
                .amount {
                    font-family: 'Inter', sans-serif;
                }
                .security-badges {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    margin-bottom: 32px;
                }
                .security-badges .badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: #6366f1;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
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
                    width: 100%;
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
                .text-muted { color: #64748b; }
                .text-center { text-align: center; }
                .text-xs { font-size: 12px; }
                .mb-4 { margin-bottom: 16px; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .justify-center { justify-content: center; }
                .gap-2 { gap: 8px; }
                .animate-fade-in {
                    animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
