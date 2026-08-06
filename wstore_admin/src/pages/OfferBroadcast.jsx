import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Image, MessageSquare, X, CheckCircle, AlertCircle, UploadCloud, ChevronLeft, Phone, Video, MoreVertical, Search, CheckSquare, Square, Users } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

const TEMPLATES = [
    { value: 'offer_template', label: 'Offer Template (Text)' },
    { value: 'offer_template_image', label: 'Offer Template with Image' },
];

const TEMPLATE_PARAMS = {
    offer_template: [
        { key: '1', label: 'Customer Name', placeholder: 'e.g. John' },
        { key: '2', label: 'Offer Details', placeholder: 'e.g. Get 20% OFF on all items' },
        { key: '3', label: 'Valid Until', placeholder: 'e.g. 31st March' },
    ],
    offer_template_image: [
        { key: '1', label: 'Customer Name', placeholder: 'e.g. John' },
        { key: '2', label: 'Offer Details', placeholder: 'e.g. Get 20% OFF on all items' },
        { key: '3', label: 'Valid Until', placeholder: 'e.g. 31st March' },
    ],
};

const LIVE_PREVIEWS = {
    offer_template: (params) => {
        const [name, details, validUntil] = params;
        return `Hello *${name || '{{1}}'}*,

We have an update for you.

*${details || '{{2}}'}*

Offer details:
*${validUntil || '{{3}}'}*

Send Hi to get started

Thank you for choosing our service.`;
    },
    offer_template_image: (params) => {
        const [name, details, validUntil] = params;
        return `Hello *${name || '{{1}}'}*,

🎉 Exclusive offer just for you!

*${details || '{{2}}'}*

Offer valid until *${validUntil || '{{3}}'}*.`;
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

const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const MAX_SIZE = 1200;
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    if (width > height) {
                        height = Math.round((height * MAX_SIZE) / width);
                        width = MAX_SIZE;
                    } else {
                        width = Math.round((width * MAX_SIZE) / height);
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Canvas blob creation failed"));
                        return;
                    }
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', 0.7);
            };
            img.onerror = (err) => reject(err);
            img.src = event.target.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
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

    // Recipient selection states
    const [recipientMode, setRecipientMode] = useState('select'); // 'select' or 'manual'
    const [customersList, setCustomersList] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomers, setSelectedCustomers] = useState([]);

    const paramDefs = TEMPLATE_PARAMS[templateName] || [];

    // Dynamically evaluate preview params:
    // If Select mode is active and we have selected contacts, show the first contact's name in the preview.
    const previewParams = paramDefs.map(p => {
        if (p.key === '1' && recipientMode === 'select' && selectedCustomers.length > 0) {
            return selectedCustomers[0].name || 'Customer';
        }
        return bodyParams[p.key] || '';
    });
    const previewText = LIVE_PREVIEWS[templateName] ? LIVE_PREVIEWS[templateName](previewParams) : '';

    // Fetch customers from backend
    const fetchCustomers = async (search = '') => {
        setLoadingCustomers(true);
        try {
            const branchId = localStorage.getItem('selectedBranchId') || '';
            const res = await fetch(`${API_ENDPOINTS.CUSTOMERS}?page=1&limit=100&branchId=${branchId}&search=${encodeURIComponent(search)}`, {
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setCustomersList(data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch customers:', e);
        } finally {
            setLoadingCustomers(false);
        }
    };

    useEffect(() => {
        if (role !== 'branch' && recipientMode === 'select') {
            fetchCustomers(customerSearch);
        }
    }, [customerSearch, role, recipientMode]);

    const toggleCustomerSelection = (customer) => {
        if (selectedCustomers.some(c => c.phone === customer.phone)) {
            setSelectedCustomers(selectedCustomers.filter(c => c.phone !== customer.phone));
        } else {
            setSelectedCustomers([...selectedCustomers, customer]);
        }
    };

    const toggleAllCustomers = () => {
        const allCurrentSelected = customersList.every(c => selectedCustomers.some(sc => sc.phone === c.phone));
        if (allCurrentSelected) {
            // Deselect all loaded search results
            setSelectedCustomers(selectedCustomers.filter(sc => !customersList.some(c => c.phone === sc.phone)));
        } else {
            // Add all loaded search results (avoid duplicates)
            const newSelections = [...selectedCustomers];
            customersList.forEach(c => {
                if (!newSelections.some(sc => sc.phone === c.phone)) {
                    newSelections.push(c);
                }
            });
            setSelectedCustomers(newSelections);
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setError(null);
            setImage(file); // Set file instantly
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
        const phoneList = recipientMode === 'select'
            ? selectedCustomers.map(c => c.phone)
            : phones.split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .map(normalizePhone)
                .filter(p => /^\d{10,15}$/.test(p));

        if (phoneList.length === 0) {
            setError(recipientMode === 'select'
                ? 'Please select at least one contact from the list.'
                : 'Please enter at least one valid phone number.'
            );
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

        // Validate bodyParams: If select mode is active, the first parameter (Customer Name) is auto-personalizing
        // and doesn't strictly block validation if empty (it will default to 'Customer' or fallback field).
        const missingParams = paramDefs.filter(p => {
            if (p.key === '1' && recipientMode === 'select') {
                return false;
            }
            return !bodyParams[p.key] || !bodyParams[p.key].trim();
        });

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
                // Compress image just before uploading
                let fileToUpload = image;
                try {
                    fileToUpload = await compressImage(image);
                } catch (compressErr) {
                    console.error("Image compression failed during send, uploading original:", compressErr);
                }

                const formData = new FormData();
                formData.append('image', fileToUpload);
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
                bodyParams: paramDefs.map(p => {
                    if (p.key === '1' && recipientMode === 'select') {
                        return 'User';
                    }
                    return bodyParams[p.key] || '';
                }),
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
                            {paramDefs.map(p => {
                                const isNameField = p.key === '1';
                                const isSelectMode = recipientMode === 'select';
                                if (isNameField && isSelectMode) {
                                    return null; // Hide Customer Name field in Select Contacts mode
                                }
                                return (
                                    <div className="input-group" key={p.key} style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{p.label}</span>
                                        </label>
                                        {p.key === '2' ? (
                                            <textarea
                                                value={bodyParams[p.key] || ''}
                                                onChange={(e) => setBodyParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                                                placeholder={p.placeholder}
                                                rows={3}
                                                style={{ resize: 'vertical' }}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={bodyParams[p.key] || ''}
                                                onChange={(e) => setBodyParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                                                placeholder={p.placeholder}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section 3: Target Recipients */}
                    <div className="white-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Users size={16} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '16px' }}>3. Target Audience</span>
                        </div>

                        {/* Mode toggle */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--bg-app)', padding: '4px', borderRadius: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setRecipientMode('select')}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    background: recipientMode === 'select' ? 'white' : 'transparent',
                                    color: recipientMode === 'select' ? 'var(--accent)' : 'var(--text-muted)',
                                    boxShadow: recipientMode === 'select' ? 'var(--shadow-sm)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Select Contacts
                            </button>
                            <button
                                type="button"
                                onClick={() => setRecipientMode('manual')}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    background: recipientMode === 'manual' ? 'white' : 'transparent',
                                    color: recipientMode === 'manual' ? 'var(--accent)' : 'var(--text-muted)',
                                    boxShadow: recipientMode === 'manual' ? 'var(--shadow-sm)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Enter Manually
                            </button>
                        </div>

                        {recipientMode === 'select' ? (
                            /* Select Contacts UI */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <input
                                            type="text"
                                            placeholder="Search name or phone..."
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px 10px 40px',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border-color)',
                                                fontSize: '13.5px',
                                                background: 'white'
                                            }}
                                        />
                                        <div style={{ position: 'absolute', left: '14px', top: '53%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }}>
                                            🔍
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-outline"
                                        onClick={toggleAllCustomers}
                                        style={{ padding: '10px 14px', fontSize: '13px', height: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <span>{customersList.length > 0 && customersList.every(c => selectedCustomers.some(sc => sc.phone === c.phone)) ? 'Deselect Page' : 'Select Page'}</span>
                                    </button>
                                </div>

                                {/* Selection Summary Banner */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '13px',
                                    background: 'var(--accent-light)',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    color: 'var(--accent)',
                                    fontWeight: 600
                                }}>
                                    <span>Selected: {selectedCustomers.length} contact{selectedCustomers.length !== 1 ? 's' : ''}</span>
                                    {selectedCustomers.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCustomers([])}
                                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                                        >
                                            Clear Selection
                                        </button>
                                    )}
                                </div>

                                {/* Scrollable Customer list */}
                                <div style={{
                                    maxHeight: '260px',
                                    overflowY: 'auto',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    background: 'var(--bg-app)',
                                    padding: '8px'
                                }}>
                                    {loadingCustomers && customersList.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                                            Searching database...
                                        </div>
                                    ) : customersList.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                                            No customers found.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {customersList.map(c => {
                                                const isSelected = selectedCustomers.some(sc => sc.phone === c.phone);
                                                return (
                                                    <div
                                                        key={c.phone}
                                                        onClick={() => toggleCustomerSelection(c)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            padding: '10px 12px',
                                                            borderRadius: '8px',
                                                            background: isSelected ? 'white' : 'transparent',
                                                            border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                                                            boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        <div style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
                                                            {isSelected ? <CheckSquare size={18} style={{ color: 'var(--accent)' }} /> : <Square size={18} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />}
                                                        </div>
                                                        <div style={{
                                                            width: '34px',
                                                            height: '34px',
                                                            background: isSelected ? 'var(--accent-light)' : 'var(--border-hover)',
                                                            color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                                                            borderRadius: '50%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 800,
                                                            fontSize: '13px'
                                                        }}>
                                                            {c.name ? c.name[0].toUpperCase() : 'C'}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {c.name || 'Unnamed Customer'}
                                                            </div>
                                                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                                                {c.phone}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Enter Manually UI */
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
                        )}
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