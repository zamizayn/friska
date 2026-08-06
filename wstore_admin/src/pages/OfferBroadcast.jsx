import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Image, MessageSquare, X, CheckCircle, AlertCircle, UploadCloud, Check, ChevronLeft, Phone, Video, MoreVertical } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

const TEMPLATES = [
    { value: 'offer_template', label: 'Offer Template (Text)' },
    { value: 'offer_template_image', label: 'Offer Template with Image' },
];

const TEMPLATE_PARAMS = {
    offer_template: [
        { key: '1', label: 'Customer Name', placeholder: 'e.g. John' },
        { key: '2', label: 'Offer Title', placeholder: 'e.g. Summer Sale' },
        { key: '3', label: 'Discount', placeholder: 'e.g. 20% OFF' },
        { key: '4', label: 'Valid Until', placeholder: 'e.g. 31st March' },
    ],
    offer_template_image: [
        { key: '1', label: 'Customer Name', placeholder: 'e.g. John' },
        { key: '2', label: 'Offer Title', placeholder: 'e.g. Summer Sale' },
        { key: '3', label: 'Discount', placeholder: 'e.g. 20% OFF' },
        { key: '4', label: 'Valid Until', placeholder: 'e.g. 31st March' },
    ],
};

const LIVE_PREVIEWS = {
    offer_template: (params) => {
        const [name, title, discount, validUntil] = params;
        return `Hey *${name || '{{1}}'}*,

We have an exclusive offer just for you!

*${title || '{{2}}'}* - *${discount || '{{3}}'}*

Valid until: *${validUntil || '{{4}}'}*

Tap below to grab this deal!
`;
    },
    offer_template_image: (params) => {
        const [name, title, discount, validUntil] = params;
        return `Hey *${name || '{{1}}'}*,

We have an exclusive offer just for you!

*${title || '{{2}}'}* - *${discount || '{{3}}'}*

Valid until: *${validUntil || '{{4}}'}*

Tap below to grab this deal!
`;
    },
};

const formatWhatsAppText = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('*') && part.endsWith('*')) {
            return <strong key={i} style={{ fontWeight: '700' }}>{part.slice(1, -1)}</strong>;
        }
        return part;
    });
};

export default function OfferBroadcast() {
    const navigate = useNavigate();
    const branchId = localStorage.getItem('selectedBranchId') || localStorage.getItem('branchId') || '';
    const role = localStorage.getItem('adminRole');

    const [templateName, setTemplateName] = useState('offer_template');
    const [phones, setPhones] = useState('');
    const [bodyParams, setBodyParams] = useState({});
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const paramDefs = TEMPLATE_PARAMS[templateName] || [];
    const previewParams = paramDefs.map(p => bodyParams[p.key] || '');
    const previewText = LIVE_PREVIEWS[templateName] ? LIVE_PREVIEWS[templateName](previewParams) : '';

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const normalizePhone = (raw) => {
        let p = raw.replace(/\s+/g, '');
        if (p.startsWith('+')) p = p.slice(1);
        return p;
    };

    const handleSend = async () => {
        const phoneList = phones.split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(normalizePhone)
            .filter(p => /^\d{10,15}$/.test(p));

        if (phoneList.length === 0) {
            setError('Please enter at least one valid phone number.');
            return;
        }

        if (!templateName) {
            setError('Please select a template.');
            return;
        }

        if (templateName === 'offer_template_image' && !image) {
            setError('Please upload a header image for this template.');
            return;
        }

        const missingParams = paramDefs.filter(p => !bodyParams[p.key] || !bodyParams[p.key].trim());
        if (missingParams.length > 0) {
            setError(`Please fill in all message variables. Missing: ${missingParams.map(p => p.label).join(', ')}`);
            return;
        }

        setSending(true);
        setError(null);
        setResult(null);

        try {
            let uploadedImageUrl = null;

            if (image && templateName === 'offer_template_image') {
                const formData = new FormData();
                formData.append('image', image);
                const uploadRes = await fetch(`${API_ENDPOINTS.OFFERS}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': getHeaders()['Authorization'] },
                    body: formData,
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    uploadedImageUrl = uploadData.url;
                }
            }

            const payload = {
                templateName,
                phones: phoneList,
                branchId: branchId || undefined,
                headerImage: uploadedImageUrl,
                bodyParams: paramDefs.map(p => bodyParams[p.key] || ''),
            };

            const res = await fetch(API_ENDPOINTS.OFFER_BROADCAST, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Broadcast failed');

            setResult(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setSending(false);
        }
    };

    if (role === 'branch') {
        return (
            <div className="dashboard-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="white-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#d97706' }}>
                        <AlertCircle size={32} />
                    </div>
                    <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                        Offer broadcast features are not available for branch accounts. Please sign in as a Tenant or Superadmin to manage campaigns.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Offer Broadcast</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                        Create and send rich WhatsApp template notifications to your customers.
                    </p>
                </div>
            </header>

            <div className="dashboard-grid">
                {/* Form Inputs (Left Column) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Section 1: Template Selection */}
                    <div className="white-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MessageSquare size={16} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '16px' }}>1. Campaign Template</span>
                        </div>

                        <div className="input-group">
                            <label>WhatsApp Approved Template</label>
                            <select
                                value={templateName}
                                onChange={(e) => { 
                                    setTemplateName(e.target.value); 
                                    setBodyParams({}); 
                                    setImage(null); 
                                    setImagePreview(null); 
                                }}
                            >
                                {TEMPLATES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        {templateName === 'offer_template_image' && (
                            <div className="input-group" style={{ marginTop: '16px' }}>
                                <label>Header Image</label>
                                {!imagePreview ? (
                                    <label style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '30px 20px',
                                        border: '2px dashed var(--border-hover)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        background: 'var(--bg-app)',
                                        transition: 'all 0.2s',
                                        textAlign: 'center'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                                    >
                                        <UploadCloud size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>Click to upload image</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG or WEBP up to 5MB</span>
                                        <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                                    </label>
                                ) : (
                                    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-app)', padding: '10px' }}>
                                        <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px' }} />
                                        <button 
                                            onClick={() => { setImage(null); setImagePreview(null); }} 
                                            style={{
                                                position: 'absolute',
                                                top: '16px',
                                                right: '16px',
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                border: 'none',
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Variables */}
                    <div className="white-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Image size={16} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '16px' }}>2. Message Variables</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '-10px' }}>
                            Customize your broadcast content by providing values for the template placeholders.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {paramDefs.map(p => (
                                <div className="input-group" key={p.key} style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{p.label}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-light)', padding: '2px 6px', borderRadius: '4px' }}>{`{{${p.key}}}`}</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={bodyParams[p.key] || ''}
                                        onChange={(e) => setBodyParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                                        placeholder={p.placeholder}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section 3: Target Recipients */}
                    <div className="white-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Send size={16} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '16px' }}>3. Target Audience</span>
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>Recipient Phone Numbers</label>
                            <textarea
                                value={phones}
                                onChange={(e) => setPhones(e.target.value)}
                                placeholder="+919876543210, +919876543211, ..."
                                rows={4}
                            />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
                                Separate multiple numbers with commas. Enter numbers with country code (e.g. +91 for India).
                            </span>
                        </div>
                    </div>

                    {/* Feedback & Actions */}
                    {error && (
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '16px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '12px',
                            border: '1px solid #fca5a5',
                            fontSize: '14px',
                            alignItems: 'flex-start'
                        }}>
                            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <strong style={{ display: 'block', marginBottom: '2px' }}>Error Details</strong>
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '16px',
                            background: '#d1fae5',
                            color: '#065f46',
                            borderRadius: '12px',
                            border: '1px solid #6ee7b7',
                            fontSize: '14px',
                            alignItems: 'flex-start'
                        }}>
                            <CheckCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <strong style={{ display: 'block', marginBottom: '2px' }}>Broadcast Complete</strong>
                                <span>Campaign sent out. Delivery report: <strong>{result.sent} success</strong>, <strong>{result.failed} failed</strong>.</span>
                            </div>
                        </div>
                    )}

                    <button
                        className="btn-primary"
                        onClick={handleSend}
                        disabled={sending}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '14px',
                            fontSize: '15px',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow-md)',
                            width: '100%'
                        }}
                    >
                        {sending ? (
                            <span>Sending Campaign...</span>
                        ) : (
                            <>
                                <Send size={16} />
                                <span>Send Campaign Broadcast</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Simulated WhatsApp Phone Mock (Right Column) */}
                <div style={{ position: 'sticky', top: '32px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>Campaign Live Preview</span>
                    
                    <div style={{
                        width: '100%',
                        maxWidth: '380px',
                        background: '#efeae2',
                        borderRadius: '24px',
                        boxShadow: 'var(--shadow-card)',
                        border: '8px solid #2e3b4e',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        aspectRatio: '9/16',
                        maxHeight: '620px',
                        alignSelf: 'center'
                    }}>
                        {/* WhatsApp Mock Top Header */}
                        <div style={{
                            background: '#075e54',
                            padding: '14px 12px 10px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ChevronLeft size={20} style={{ cursor: 'pointer' }} />
                                <div style={{ 
                                    width: '34px', 
                                    height: '34px', 
                                    borderRadius: '50%', 
                                    background: 'var(--accent)', 
                                    color: 'white', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}>
                                    {localStorage.getItem('tenantName')?.charAt(0) || 'F'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {localStorage.getItem('tenantName') || 'Friska Store'}
                                        <span style={{ 
                                            width: '12px', 
                                            height: '12px', 
                                            borderRadius: '50%', 
                                            background: '#3897f0', 
                                            color: 'white', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            fontSize: '8px',
                                            fontWeight: 'bold'
                                        }}>✓</span>
                                    </span>
                                    <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)' }}>online</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '14px', color: 'white', opacity: 0.9 }}>
                                <Video size={18} />
                                <Phone size={16} />
                                <MoreVertical size={18} />
                            </div>
                        </div>

                        {/* WhatsApp Mock Chat Area */}
                        <div style={{
                            flex: 1,
                            padding: '16px 12px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start'
                        }}>
                            <div style={{ 
                                alignSelf: 'center', 
                                background: 'rgba(225, 243, 254, 0.8)', 
                                color: '#1c3d5a', 
                                fontSize: '11px', 
                                padding: '5px 12px', 
                                borderRadius: '8px', 
                                marginBottom: '20px', 
                                textAlign: 'center', 
                                boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
                                maxWidth: '85%'
                            }}>
                                🔒 Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
                            </div>

                            {/* Message Bubble */}
                            <div style={{
                                alignSelf: 'flex-start',
                                background: '#ffffff',
                                borderRadius: '0 12px 12px 12px',
                                padding: '6px',
                                maxWidth: '85%',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                display: 'flex',
                                flexDirection: 'column',
                                border: '1px solid rgba(0,0,0,0.04)',
                                position: 'relative'
                            }}>
                                {/* Message Image Header */}
                                {templateName === 'offer_template_image' && (
                                    <div style={{
                                        width: '100%',
                                        height: '140px',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        background: '#eaedf0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '6px',
                                        border: '1px solid rgba(0,0,0,0.05)'
                                    }}>
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Offer Header" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#8a99ad' }}>
                                                <Image size={24} />
                                                <span style={{ fontSize: '11px' }}>Header Image Preview</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Message Content */}
                                <div style={{
                                    padding: '6px 8px 18px',
                                    fontSize: '13.5px',
                                    color: '#111b21',
                                    lineHeight: '1.45',
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'inherit'
                                }}>
                                    {previewText ? formatWhatsAppText(previewText) : 'Select template and fill variables.'}
                                    
                                    {/* Time Stamp inside bubble */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '4px',
                                        right: '8px',
                                        fontSize: '10px',
                                        color: '#667781',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                    }}>
                                        <span>12:00 PM</span>
                                    </div>
                                </div>

                                {/* Custom CTA Action Buttons at bottom of WhatsApp Message */}
                                <div style={{
                                    borderTop: '1px solid #f0f2f5',
                                    marginTop: '2px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: '#fafafa',
                                    borderRadius: '0 0 10px 10px'
                                }}>
                                    <a href="#link" onClick={(e) => e.preventDefault()} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '10px',
                                        color: '#00a884',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        borderBottom: '1px solid #f0f2f5'
                                    }}>
                                        <Send size={12} />
                                        <span>Grab Deal</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Mock Bottom Input Bar */}
                        <div style={{
                            background: '#f0f2f5',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <div style={{
                                flex: 1,
                                background: 'white',
                                borderRadius: '20px',
                                padding: '8px 14px',
                                fontSize: '13.5px',
                                color: '#8696a0',
                                border: '1px solid #e1e6eb',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span>Message...</span>
                                <span>📎 📷</span>
                            </div>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#00a884',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                🎙️
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}