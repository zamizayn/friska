import { useEffect, useState } from 'react';
import { Truck, Save, ShieldCheck, AlertCircle, Plus, Trash2, IndianRupee, Route, Gift, MapPin } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

const DEFAULT_FEE_FORM = {
    enabled: false,
    mode: 'order',
    freeAbove: '',
    orderTiers: [{ minSubtotal: '0', fee: '' }],
    distanceSlabs: [{ uptoKm: '', fee: '' }]
};

const feeConfigToForm = (config) => {
    if (!config) return { ...DEFAULT_FEE_FORM };
    const str = (rows, keys) => rows.map(r => Object.fromEntries(keys.map(k => [k, String(r[k])])));
    return {
        enabled: config.enabled !== false,
        mode: config.mode,
        freeAbove: config.freeAboveSubtotal != null ? String(config.freeAboveSubtotal) : '',
        orderTiers: config.orderTiers?.length ? str(config.orderTiers, ['minSubtotal', 'fee']) : DEFAULT_FEE_FORM.orderTiers,
        distanceSlabs: config.distanceSlabs?.length ? str(config.distanceSlabs, ['uptoKm', 'fee']) : DEFAULT_FEE_FORM.distanceSlabs
    };
};

const feeFormToConfig = (fee, hadConfig) => {
    // A branch that never had a fee config and leaves it off stays null
    if (!fee.enabled && !hadConfig) return null;
    const num = (v) => parseFloat(v) || 0;
    const config = { enabled: fee.enabled, mode: fee.mode };
    if (parseFloat(fee.freeAbove) > 0) config.freeAboveSubtotal = parseFloat(fee.freeAbove);
    if (fee.mode !== 'distance') {
        config.orderTiers = fee.orderTiers.map(t => ({ minSubtotal: num(t.minSubtotal), fee: num(t.fee) }));
    }
    if (fee.mode !== 'order') {
        config.distanceSlabs = fee.distanceSlabs.map(s => ({ uptoKm: num(s.uptoKm), fee: num(s.fee) }));
    }
    return config;
};

export default function DeliveryFee() {
    const role = localStorage.getItem('adminRole');
    const canPickBranch = role === 'superadmin' || role === 'tenant';

    const [branches, setBranches] = useState([]);
    const [branchId, setBranchId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [feeForm, setFeeForm] = useState({ ...DEFAULT_FEE_FORM });
    const [hadConfig, setHadConfig] = useState(false);

    const branch = branches.find(b => String(b.id) === String(branchId));

    const selectBranch = (b) => {
        setBranchId(b ? String(b.id) : '');
        setFeeForm(feeConfigToForm(b?.deliveryFeeConfig));
        setHadConfig(!!b?.deliveryFeeConfig);
        setMessage(null);
    };

    const loadBranches = async (keepId) => {
        try {
            const res = await fetch(API_ENDPOINTS.BRANCHES, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to load branches');
            const data = await res.json();
            setBranches(data);
            const stored = localStorage.getItem('selectedBranchId') || localStorage.getItem('branchId');
            const wanted = data.find(b => String(b.id) === String(keepId || stored)) || data[0];
            selectBranch(wanted);
        } catch (e) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadBranches(); }, []);

    const updateRow = (listKey, index, field, value) => {
        setFeeForm(prev => ({
            ...prev,
            [listKey]: prev[listKey].map((row, i) => i === index ? { ...row, [field]: value } : row)
        }));
    };
    const addRow = (listKey, blank) => setFeeForm(prev => ({ ...prev, [listKey]: [...prev[listKey], blank] }));
    const removeRow = (listKey, index) => setFeeForm(prev => ({
        ...prev,
        [listKey]: prev[listKey].length > 1 ? prev[listKey].filter((_, i) => i !== index) : prev[listKey]
    }));

    const handleSave = async (e) => {
        e.preventDefault();
        if (!branch) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_ENDPOINTS.BRANCHES}/${branch.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ deliveryFeeConfig: feeFormToConfig(feeForm, hadConfig) })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to save delivery fee');
            setMessage({ type: 'success', text: `Delivery fee saved for ${branch.name}.` });
            await loadBranches(branch.id);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const usesDistance = feeForm.enabled && feeForm.mode !== 'order';
    const showOrder = feeForm.mode !== 'distance';
    const showDistance = feeForm.mode !== 'order';
    const missingLocation = branch && (branch.latitude == null || branch.longitude == null);
    const missingRadius = branch && !branch.deliveryRadius;

    const MODES = [
        { value: 'order', label: 'Order value', desc: 'Fee depends on the order amount' },
        { value: 'distance', label: 'Distance', desc: 'Fee depends on how far the customer is' },
        { value: 'both', label: 'Order value + Distance', desc: 'Both fees are added together' }
    ];

    const iconTile = (Icon) => (
        <div style={{ width: '40px', height: '40px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={20} />
        </div>
    );
    const cardHeader = (Icon, title, subtitle, right) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            {iconTile(Icon)}
            <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{title}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{subtitle}</p>
            </div>
            {right}
        </div>
    );
    const amountInput = (props) => (
        <div className="input-group" style={{ margin: 0, maxWidth: '180px' }}>
            <input type="number" min="0" step="any" required style={{ background: 'var(--bg-app)' }} {...props} />
        </div>
    );
    const rowRemove = (listKey, i) => (
        <button type="button" className="btn-outline" style={{ padding: '8px', color: 'var(--danger)' }} title="Remove"
            disabled={feeForm[listKey].length === 1} onClick={() => removeRow(listKey, i)}>
            <Trash2 size={16} />
        </button>
    );

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Delivery Fee</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                        Charge customers for delivery by order value, distance, or both
                    </p>
                </div>
                {branch && (
                    <div className="input-group" style={{ minWidth: '240px', margin: 0 }}>
                        {canPickBranch ? (
                            <select value={branchId} aria-label="Branch"
                                onChange={e => selectBranch(branches.find(b => String(b.id) === e.target.value))}>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                <MapPin size={16} /> {branch.name}
                            </div>
                        )}
                    </div>
                )}
            </header>

            <div style={{ maxWidth: '800px' }}>
                {message && (
                    <div style={{
                        padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '12px',
                        background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        color: message.type === 'success' ? '#059669' : '#dc2626',
                        border: `1px solid ${message.type === 'success' ? '#10b981' : '#f87171'}`
                    }}>
                        {message.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                        {message.text}
                    </div>
                )}

                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                ) : !branch ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                        <Truck size={64} style={{ opacity: 0.1, marginBottom: '24px' }} />
                        <p>No branches found. Create a branch first.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSave}>
                        <div className="white-card" style={{ padding: '32px', marginBottom: '24px' }}>
                            {cardHeader(Truck, 'Delivery Fee', `Settings for ${branch.name}`,
                                <span className={`status-pill ${feeForm.enabled ? 'success' : 'warning'}`}>{feeForm.enabled ? 'On' : 'Off'}</span>)}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input type="checkbox" id="feeEnabled" checked={feeForm.enabled}
                                    onChange={e => setFeeForm({ ...feeForm, enabled: e.target.checked })}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                <label htmlFor="feeEnabled" style={{ cursor: 'pointer', fontWeight: 600 }}>Charge a delivery fee on this branch</label>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0 0 30px' }}>
                                {feeForm.enabled
                                    ? 'Customers see the fee before they pay.'
                                    : 'Delivery is free. Your fee settings are kept if you turn this back on.'}
                            </p>

                            {feeForm.enabled && (
                                <div style={{ marginTop: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Charge based on</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                        {MODES.map(m => {
                                            const active = feeForm.mode === m.value;
                                            return (
                                                <button key={m.value} type="button" onClick={() => setFeeForm({ ...feeForm, mode: m.value })}
                                                    style={{
                                                        textAlign: 'left', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                                                        border: `2px solid ${active ? 'var(--accent)' : 'var(--border-color)'}`,
                                                        background: active ? 'var(--accent-light)' : 'var(--bg-card)', color: 'var(--text-main)'
                                                    }}>
                                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{m.label}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{m.desc}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {feeForm.enabled && showOrder && (
                            <div className="white-card" style={{ padding: '32px', marginBottom: '24px' }}>
                                {cardHeader(IndianRupee, 'Order value fee',
                                    'Fee for orders at or above each amount, after discount and before GST. Use a fee of 0 for free delivery.')}
                                <table className="modern-table">
                                    <thead><tr><th>Order from (₹)</th><th>Delivery fee (₹)</th><th /></tr></thead>
                                    <tbody>
                                        {feeForm.orderTiers.map((tier, i) => (
                                            <tr key={i}>
                                                <td>{amountInput({ value: tier.minSubtotal, disabled: i === 0, placeholder: '0', onChange: e => updateRow('orderTiers', i, 'minSubtotal', e.target.value) })}</td>
                                                <td>{amountInput({ value: tier.fee, placeholder: '0', onChange: e => updateRow('orderTiers', i, 'fee', e.target.value) })}</td>
                                                <td style={{ textAlign: 'right' }}>{rowRemove('orderTiers', i)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button type="button" className="btn-outline" style={{ marginTop: '8px' }}
                                    onClick={() => addRow('orderTiers', { minSubtotal: '', fee: '' })}>
                                    <Plus size={16} /> Add tier
                                </button>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>The first tier always starts at ₹0.</p>
                            </div>
                        )}

                        {feeForm.enabled && showDistance && (
                            <div className="white-card" style={{ padding: '32px', marginBottom: '24px' }}>
                                {cardHeader(Route, 'Distance fee',
                                    `Fee for deliveries up to each distance. Customers are already limited by the branch delivery radius${branch.deliveryRadius ? ` (${branch.deliveryRadius} km)` : ''}.`)}
                                {usesDistance && (missingLocation || missingRadius) && (
                                    <div style={{ fontSize: '13px', color: '#854d0e', marginBottom: '16px', background: '#fef9c3', padding: '12px 16px', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span>This branch has no {missingLocation ? 'location (latitude/longitude)' : 'delivery radius'} set in Branches. Until it does, every order is charged the first distance slab.</span>
                                    </div>
                                )}
                                <table className="modern-table">
                                    <thead><tr><th>Up to (km)</th><th>Delivery fee (₹)</th><th /></tr></thead>
                                    <tbody>
                                        {feeForm.distanceSlabs.map((slab, i) => (
                                            <tr key={i}>
                                                <td>{amountInput({ value: slab.uptoKm, placeholder: 'e.g. 2', onChange: e => updateRow('distanceSlabs', i, 'uptoKm', e.target.value) })}</td>
                                                <td>{amountInput({ value: slab.fee, placeholder: '0', onChange: e => updateRow('distanceSlabs', i, 'fee', e.target.value) })}</td>
                                                <td style={{ textAlign: 'right' }}>{rowRemove('distanceSlabs', i)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button type="button" className="btn-outline" style={{ marginTop: '8px' }}
                                    onClick={() => addRow('distanceSlabs', { uptoKm: '', fee: '' })}>
                                    <Plus size={16} /> Add slab
                                </button>
                            </div>
                        )}

                        {feeForm.enabled && (
                            <div className="white-card" style={{ padding: '32px', marginBottom: '24px' }}>
                                {cardHeader(Gift, 'Free delivery', 'Optional. Orders at or above this amount pay no delivery fee, whatever the rules above say.')}
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label>Free delivery for orders of (₹) or more</label>
                                    <input type="number" min="0" step="any" placeholder="e.g. 500 — leave blank for no free delivery"
                                        value={feeForm.freeAbove} style={{ background: 'var(--bg-app)' }}
                                        onChange={e => setFeeForm({ ...feeForm, freeAbove: e.target.value })} />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn-primary" style={{ padding: '12px 32px' }} disabled={saving}>
                                {saving ? 'Saving Changes...' : <><Save size={18} /> Save Delivery Fee</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
