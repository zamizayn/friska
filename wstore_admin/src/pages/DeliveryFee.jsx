import { useEffect, useState } from 'react';
import { Truck, Save, ShieldCheck, AlertCircle, Plus, Trash2, IndianRupee, Route, Gift, MapPin } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

const DEFAULT_FEE_FORM = {
    enabled: false,
    useOrder: true,
    useDistance: true,
    freeAbove: '',
    // Each row is a range: from = previous row's `to` (0 for the first). The last order row's `to` is orderMaxSubtotal
    orderTiers: [{ to: '', fee: '' }],
    distanceSlabs: [{ to: '', fee: '' }]
};

const feeConfigToForm = (config) => {
    if (!config) return { ...DEFAULT_FEE_FORM };
    const orderTiers = config.orderTiers?.length
        ? config.orderTiers.map((t, i, all) => ({
            to: all[i + 1] ? String(all[i + 1].minSubtotal) : (config.orderMaxSubtotal != null ? String(config.orderMaxSubtotal) : ''),
            fee: String(t.fee)
        }))
        : DEFAULT_FEE_FORM.orderTiers;
    const distanceSlabs = config.distanceSlabs?.length
        ? config.distanceSlabs.map(sl => ({ to: String(sl.uptoKm), fee: String(sl.fee) }))
        : DEFAULT_FEE_FORM.distanceSlabs;
    return {
        enabled: config.enabled !== false,
        // Each fee is optional: a saved config only has the lists of the fees it charges
        useOrder: config.mode !== 'distance',
        useDistance: config.mode !== 'order',
        freeAbove: config.freeAboveSubtotal != null ? String(config.freeAboveSubtotal) : '',
        orderTiers,
        distanceSlabs
    };
};

const feeFormToConfig = (fee, originalConfig) => {
    if (!fee.enabled) {
        // Turning the fee off keeps the saved rules untouched; a branch that never had a config stays null
        return originalConfig ? { ...originalConfig, enabled: false } : null;
    }
    const num = (v) => parseFloat(v) || 0;
    const config = {
        enabled: true,
        mode: fee.useOrder && fee.useDistance ? 'both' : fee.useOrder ? 'order' : 'distance'
    };
    if (parseFloat(fee.freeAbove) > 0) config.freeAboveSubtotal = parseFloat(fee.freeAbove);
    if (fee.useOrder) {
        config.orderTiers = fee.orderTiers.map((t, i) => ({
            minSubtotal: i === 0 ? 0 : num(fee.orderTiers[i - 1].to),
            fee: num(t.fee)
        }));
        // The last row's "To" is its upper limit: orders at or above it pay no order-value fee
        config.orderMaxSubtotal = num(fee.orderTiers[fee.orderTiers.length - 1].to);
    }
    if (fee.useDistance) {
        config.distanceSlabs = fee.distanceSlabs.map(sl => ({ uptoKm: num(sl.to), fee: num(sl.fee) }));
    }
    return config;
};

// Ranges must keep growing: each "to" has to be above the previous one.
const validateRanges = (fee) => {
    const check = (rows, label) => {
        let prev = 0;
        for (let i = 0; i < rows.length; i++) {
            const to = parseFloat(rows[i].to);
            if (!(to > prev)) return `${label}: row ${i + 1} must end above ${prev}.`;
            prev = to;
        }
        return null;
    };
    if (!fee.enabled) return null;
    if (!fee.useOrder && !fee.useDistance) return 'Turn on the order value fee, the distance fee, or both.';
    return (fee.useOrder && check(fee.orderTiers, 'Order value fee'))
        || (fee.useDistance && check(fee.distanceSlabs, 'Distance fee'))
        || null;
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
    const [originalConfig, setOriginalConfig] = useState(null);

    const branch = branches.find(b => String(b.id) === String(branchId));

    const selectBranch = (b) => {
        setBranchId(b ? String(b.id) : '');
        setFeeForm(feeConfigToForm(b?.deliveryFeeConfig));
        setOriginalConfig(b?.deliveryFeeConfig || null);
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
                body: JSON.stringify({ deliveryFeeConfig: feeFormToConfig(feeForm, originalConfig) })
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

    const missingLocation = branch && (branch.latitude == null || branch.longitude == null);
    const missingRadius = branch && !branch.deliveryRadius;

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
    const feeSwitch = (key, label) => (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
            <input type="checkbox" checked={feeForm[key]}
                onChange={e => setFeeForm({ ...feeForm, [key]: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
            {label}
        </label>
    );
    const offNote = (text) => (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{text}</p>
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
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '16px 0 0' }}>
                                    Turn on the <b>order value fee</b>, the <b>distance fee</b>, or both. If both are on, the customer pays the two added together.
                                </p>
                            )}
                        </div>

                        {feeForm.enabled && (
                            <div className="white-card" style={{ padding: '32px', marginBottom: '24px' }}>
                                {cardHeader(IndianRupee, 'Order value fee',
                                    'Delivery fee for each order amount range, measured after discount and before GST. Use a fee of 0 for free delivery.',
                                    feeSwitch('useOrder', feeForm.useOrder ? 'On' : 'Off'))}
                                {!feeForm.useOrder ? offNote('Not charged. Turn this on to add a fee based on the order amount.') : <>
                                <table className="modern-table">
                                    <thead><tr><th>From (₹)</th><th>To (₹)</th><th>Delivery fee (₹)</th><th /></tr></thead>
                                    <tbody>
                                        {feeForm.orderTiers.map((tier, i, all) => (
                                            <tr key={i}>
                                                <td>{rangeFrom(i === 0 ? 0 : all[i - 1].to)}</td>
                                                <td>{amountInput({
                                                    value: tier.to,
                                                    placeholder: 'e.g. 300',
                                                    onChange: e => updateRow('orderTiers', i, 'to', e.target.value)
                                                })}</td>
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
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>A range includes its From amount but not its To amount, so 0 – 300 covers ₹0 to ₹299.99 and the next range starts at ₹300. Orders at or above the last To amount pay no order value fee.</p>
                                </>}
                            </div>
                        )}

                        {feeForm.enabled && (
                            <div className="white-card" style={{ padding: '32px', marginBottom: '24px' }}>
                                {cardHeader(Route, 'Distance fee',
                                    `Fee for deliveries up to each distance. Customers are already limited by the branch delivery radius${branch.deliveryRadius ? ` (${branch.deliveryRadius} km)` : ''}.`,
                                    feeSwitch('useDistance', feeForm.useDistance ? 'On' : 'Off'))}
                                {!feeForm.useDistance ? offNote('Not charged. Turn this on to add a fee based on how far the customer is.') : <>
                                {(missingLocation || missingRadius) && (
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
                                </>}
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
