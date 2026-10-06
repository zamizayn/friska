import { useEffect, useState } from 'react';
import { Truck, Save, ShieldCheck, AlertCircle, Plus, Trash2, IndianRupee, Route, Gift, MapPin } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

const DEFAULT_FEE_FORM = {
    enabled: false,
    mode: 'order',
    freeAbove: '',
    // Each row is a range: from = previous row's `to` (0 for the first); the last row has no upper limit for orders
    orderTiers: [{ to: '', fee: '' }],
    distanceSlabs: [{ to: '', fee: '' }]
};

const feeConfigToForm = (config) => {
    if (!config) return { ...DEFAULT_FEE_FORM };
    const orderTiers = config.orderTiers?.length
        ? config.orderTiers.map((t, i, all) => ({ to: all[i + 1] ? String(all[i + 1].minSubtotal) : '', fee: String(t.fee) }))
        : DEFAULT_FEE_FORM.orderTiers;
    const distanceSlabs = config.distanceSlabs?.length
        ? config.distanceSlabs.map(sl => ({ to: String(sl.uptoKm), fee: String(sl.fee) }))
        : DEFAULT_FEE_FORM.distanceSlabs;
    return {
        enabled: config.enabled !== false,
        mode: config.mode,
        freeAbove: config.freeAboveSubtotal != null ? String(config.freeAboveSubtotal) : '',
        orderTiers,
        distanceSlabs
    };
};

const feeFormToConfig = (fee, hadConfig) => {
    // A branch that never had a fee config and leaves it off stays null
    if (!fee.enabled && !hadConfig) return null;
    const num = (v) => parseFloat(v) || 0;
    const config = { enabled: fee.enabled, mode: fee.mode };
    if (parseFloat(fee.freeAbove) > 0) config.freeAboveSubtotal = parseFloat(fee.freeAbove);
    if (fee.mode !== 'distance') {
        config.orderTiers = fee.orderTiers.map((t, i) => ({
            minSubtotal: i === 0 ? 0 : num(fee.orderTiers[i - 1].to),
            fee: num(t.fee)
        }));
    }
    if (fee.mode !== 'order') {
        config.distanceSlabs = fee.distanceSlabs.map(sl => ({ uptoKm: num(sl.to), fee: num(sl.fee) }));
    }
    return config;
};

// Ranges must keep growing: each "to" has to be above the previous one. The last order range is open-ended.
const validateRanges = (fee) => {
    const check = (rows, label, openEnded) => {
        let prev = 0;
        for (let i = 0; i < rows.length; i++) {
            if (openEnded && i === rows.length - 1) break;
            const to = parseFloat(rows[i].to);
            if (!(to > prev)) return `${label}: row ${i + 1} must end above ${prev}.`;
            prev = to;
        }
        return null;
    };
    if (!fee.enabled) return null;
    if (fee.mode !== 'distance') { const e = check(fee.orderTiers, 'Order value fee', true); if (e) return e; }
    if (fee.mode !== 'order') { const e = check(fee.distanceSlabs, 'Distance fee', false); if (e) return e; }
    return null;
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
        const rangeError = validateRanges(feeForm);
        if (rangeError) { setMessage({ type: 'error', text: rangeError }); return; }
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
    const rangeFrom = (value) => (
        <span style={{ fontWeight: 600 }}>{value === '' || value == null ? '—' : value}</span>
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

            <style>{`
                .delivery-fee-page input[type=number]::-webkit-outer-spin-button,
                .delivery-fee-page input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                .delivery-fee-page input[type=number] { -moz-appearance: textfield; appearance: textfield; }
            `}</style>

            <div className="delivery-fee-page" style={{ maxWidth: '800px' }}>
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
                                    'Delivery fee for each order amount range, measured after discount and before GST. Use a fee of 0 for free delivery.')}
                                <table className="modern-table">
                                    <thead><tr><th>From (₹)</th><th>To (₹)</th><th>Delivery fee (₹)</th><th /></tr></thead>
                                    <tbody>
                                        {feeForm.orderTiers.map((tier, i, all) => (
                                            <tr key={i}>
                                                <td>{rangeFrom(i === 0 ? 0 : all[i - 1].to)}</td>
                                                <td>{i === all.length - 1
                                                    ? <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>and above</span>
                                                    : amountInput({ value: tier.to, placeholder: 'e.g. 300', onChange: e => updateRow('orderTiers', i, 'to', e.target.value) })}</td>
                                                <td>{amountInput({ value: tier.fee, placeholder: '0', onChange: e => updateRow('orderTiers', i, 'fee', e.target.value) })}</td>
                                                <td style={{ textAlign: 'right' }}>{rowRemove('orderTiers', i)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button type="button" className="btn-outline" style={{ marginTop: '8px' }}
                                    onClick={() => addRow('orderTiers', { to: '', fee: '' })}>
                                    <Plus size={16} /> Add tier
                                </button>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>A range includes its From amount but not its To amount, so 0 – 300 covers ₹0 to ₹299.99 and the next range starts at ₹300.</p>
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
                                    <thead><tr><th>From (km)</th><th>To (km)</th><th>Delivery fee (₹)</th><th /></tr></thead>
                                    <tbody>
                                        {feeForm.distanceSlabs.map((slab, i, all) => (
                                            <tr key={i}>
                                                <td>{rangeFrom(i === 0 ? 0 : all[i - 1].to)}</td>
                                                <td>{amountInput({ value: slab.to, placeholder: 'e.g. 2', onChange: e => updateRow('distanceSlabs', i, 'to', e.target.value) })}</td>
                                                <td>{amountInput({ value: slab.fee, placeholder: '0', onChange: e => updateRow('distanceSlabs', i, 'fee', e.target.value) })}</td>
                                                <td style={{ textAlign: 'right' }}>{rowRemove('distanceSlabs', i)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button type="button" className="btn-outline" style={{ marginTop: '8px' }}
                                    onClick={() => addRow('distanceSlabs', { to: '', fee: '' })}>
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
