import { useEffect, useState } from 'react';
import { MessageSquare, Save, Info, AlertCircle, Sparkles, ShoppingBag, MapPin, CreditCard, CheckCircle, Package } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function WhatsAppSettings() {
    const [settings, setSettings] = useState({
        welcomeReturning: 'Welcome back to *{{tenant_name}}*, {{customer_name}}! 😊',
        welcomeNew: 'Welcome to *{{tenant_name}}*! 🛍️',
        supportMessage: '🆘 *Help & Support*\n\nIs your issue related to a specific order?',
        searchProductsMessage: '🔍 *Product Search*\n\nType the name of the product you are looking for:',
        chooseBranchMessage: '📍 Choose your nearest branch',
        cartEmptyMessage: '🛒 Your cart is empty',
        enterAddressMessage: '📍 Please enter your delivery address',
        selectAddressMessage: 'Where should we deliver? Select a saved address or add a new one.',
        paymentMethodMessage: '💳 How would you like to pay?',
        orderConfirmedMessage: '✅ *Order Confirmed!* #{{order_id}}\n\nYour order has been placed successfully via *{{payment_method}}*.\n\nThank you for shopping with us! 🛍️',
        abandonedCartMessage: '👋 Hey! We noticed you have items in your cart. Would you like to complete your order? 🛒'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.WHATSAPP_SETTINGS, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => {
                    const next = { ...prev };
                    Object.keys(data).forEach(key => {
                        if (data[key]) next[key] = data[key];
                    });
                    return next;
                });
            }
        } catch (e) {
            console.error('Failed to fetch WhatsApp settings:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch(API_ENDPOINTS.WHATSAPP_SETTINGS, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                alert('WhatsApp messages updated successfully! ✨');
            } else {
                alert('Failed to update settings.');
            }
        } catch (e) {
            alert('Error updating settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (isLoading) return <div className="loading-content">Loading Experience...</div>;

    const sections = [
        {
            title: "Greetings & Welcome",
            icon: <Sparkles size={20} color="#6366f1" />,
            fields: [
                { id: 'welcomeReturning', label: 'Returning Customer Welcome', placeholder: 'Welcome back to *{{tenant_name}}*, {{customer_name}}! 😊', hint: 'Placeholders: {{tenant_name}}, {{customer_name}}' },
                { id: 'welcomeNew', label: 'New Customer Welcome', placeholder: 'Welcome to *{{tenant_name}}*! 🛍️', hint: 'Placeholders: {{tenant_name}}' },
            ]
        },
        {
            title: "Shopping Experience",
            icon: <ShoppingBag size={20} color="#10b981" />,
            fields: [
                { id: 'searchProductsMessage', label: 'Product Search Prompt', placeholder: '🔍 *Product Search*\n\nType the name of the product you are looking for:' },
                { id: 'chooseBranchMessage', label: 'Branch Selection', placeholder: '📍 Choose your nearest branch' },
                { id: 'cartEmptyMessage', label: 'Empty Cart Message', placeholder: '🛒 Your cart is empty' },
            ]
        },
        {
            title: "Checkout Flow",
            icon: <Package size={20} color="#f59e0b" />,
            fields: [
                { id: 'enterAddressMessage', label: 'Address Collection', placeholder: '📍 Please enter your delivery address' },
                { id: 'selectAddressMessage', label: 'Select Saved Address Prompt', placeholder: 'Where should we deliver? Select a saved address or add a new one.' },
                { id: 'paymentMethodMessage', label: 'Payment Method Selection', placeholder: '💳 How would you like to pay?' },
                { id: 'orderConfirmedMessage', label: 'Order Confirmation', placeholder: '✅ *Order Confirmed!* #{{order_id}}\n\nYour order has been placed successfully via *{{payment_method}}*.\n\nThank you for shopping with us! 🛍️', hint: 'Placeholders: {{order_id}}, {{payment_method}}' },
                { id: 'phone', label: 'WhatsApp Order Number', placeholder: '917012738756', hint: 'The number where catalog orders will be sent' },
            ]
        },
        {
            title: "Support & Engagement",
            icon: <MessageSquare size={20} color="#ef4444" />,
            fields: [
                { id: 'supportMessage', label: 'Help & Support Intro', placeholder: '🆘 *Help & Support*\n\nIs your issue related to a specific order?' },
                { id: 'abandonedCartMessage', label: 'Abandoned Cart Reminder', placeholder: '👋 Hey! We noticed you have items in your cart. Would you like to complete your order? 🛒' },
            ]
        }
    ];

    return (
        <div className="whatsapp-settings-page">
            <section className="hero-banner" style={{ minHeight: 'auto', padding: '40px' }}>
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                            <MessageSquare size={20} color="#fff" />
                        </div>
                        <h1 style={{ margin: 0, fontSize: '28px' }}>WhatsApp Conversation Flows</h1>
                    </div>
                    <p style={{ maxWidth: '600px', opacity: 0.9 }}>
                        Personalize the automated messages your customers receive on WhatsApp. Use a unique tone of voice that reflects your brand identity.
                    </p>
                </div>
            </section>

            <div className="settings-container" style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
                <form onSubmit={handleSave}>
                    {sections.map((section, sIdx) => (
                        <div key={sIdx} className="white-card" style={{ marginBottom: '32px' }}>
                            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '24px', paddingBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${section.icon.props.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {section.icon}
                                    </div>
                                    <h3 style={{ margin: 0 }}>{section.title}</h3>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                                {section.fields.map(field => (
                                    <div key={field.id} className="input-group" style={{ marginBottom: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <label style={{ fontWeight: 600, fontSize: '14px' }}>{field.label}</label>
                                            {field.hint && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                                    <Info size={12} />
                                                    {field.hint}
                                                </div>
                                            )}
                                        </div>
                                        <textarea
                                            value={settings[field.id]}
                                            onChange={e => handleChange(field.id, e.target.value)}
                                            placeholder={field.placeholder}
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-app)',
                                                fontSize: '14px',
                                                lineHeight: '1.5',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div style={{ position: 'sticky', bottom: '32px', display: 'flex', justifyContent: 'flex-end', zIndex: 100 }}>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSaving}
                            style={{
                                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
                                padding: '12px 32px',
                                borderRadius: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            {isSaving ? (
                                'Saving Settings...'
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Conversation Flows
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <div style={{ marginTop: '40px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sparkles size={20} color="#f59e0b" />
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Pro Tip: Use Formatting</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                            You can use standard WhatsApp formatting in your messages: <br />
                            <strong>*Bold*</strong> for emphasis, <em>_Italics_</em> for subtle notes, and ~Strikethrough~ for corrections. <br />
                            Adding emojis 🛍️ ✨ 😊 also makes the experience feel much more friendly and human.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
