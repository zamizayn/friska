const { calculateDistance } = require('../utils/distance');

const MODES = ['order', 'distance', 'both'];

const isNum = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

const normaliseOrderTiers = (tiers) => {
    if (!Array.isArray(tiers) || tiers.length === 0) {
        return { error: 'orderTiers must be a non-empty array' };
    }
    if (!tiers.every(t => t && isNum(t.minSubtotal) && isNum(t.fee))) {
        return { error: 'each order tier needs numeric minSubtotal and fee (>= 0)' };
    }
    const orderTiers = tiers
        .map(t => ({ minSubtotal: t.minSubtotal, fee: t.fee }))
        .sort((a, b) => a.minSubtotal - b.minSubtotal);
    if (orderTiers[0].minSubtotal !== 0) {
        return { error: 'the first order tier must start at minSubtotal 0' };
    }
    return { orderTiers };
};

const normaliseDistanceSlabs = (slabs) => {
    if (!Array.isArray(slabs) || slabs.length === 0) {
        return { error: 'distanceSlabs must be a non-empty array' };
    }
    if (!slabs.every(s => s && isNum(s.uptoKm) && s.uptoKm > 0 && isNum(s.fee))) {
        return { error: 'each distance slab needs numeric uptoKm (> 0) and fee (>= 0)' };
    }
    const distanceSlabs = slabs
        .map(s => ({ uptoKm: s.uptoKm, fee: s.fee }))
        .sort((a, b) => a.uptoKm - b.uptoKm);
    return { distanceSlabs };
};

/**
 * Validates and normalises a branch deliveryFeeConfig.
 * Returns { config, error }. A null/empty input is valid and means "no delivery fee".
 * `enabled` (default true) switches the fee off without losing the configured tiers/slabs.
 *   { mode: 'order',    orderTiers:    [{ minSubtotal, fee }] }
 *   { mode: 'distance', distanceSlabs: [{ uptoKm, fee }] }
 *   { mode: 'both',     orderTiers, distanceSlabs }   // the two fees are added together
 * Any mode may also set `freeAboveSubtotal` (> 0): orders at or above it get no fee.
 * Modes with orderTiers may set `orderMaxSubtotal`: the last tier's upper limit. Orders at or above it
 * pay no order-value fee (the distance part of a 'both' fee is unaffected).
 */
const validateDeliveryFeeConfig = (input) => {
    if (input == null || input === '') return { config: null, error: null };
    if (typeof input !== 'object' || !MODES.includes(input.mode)) {
        return { config: null, error: `mode must be one of: ${MODES.join(', ')}` };
    }
    if (input.enabled != null && typeof input.enabled !== 'boolean') {
        return { config: null, error: 'enabled must be true or false' };
    }

    const config = { enabled: input.enabled !== false, mode: input.mode };
    const free = input.freeAboveSubtotal;
    if (free != null && free !== '') {
        if (!isNum(free) || free <= 0) {
            return { config: null, error: 'freeAboveSubtotal must be a number greater than 0' };
        }
        config.freeAboveSubtotal = free;
    }
    if (input.mode !== 'distance') {
        const { orderTiers, error } = normaliseOrderTiers(input.orderTiers);
        if (error) return { config: null, error };
        config.orderTiers = orderTiers;
        const max = input.orderMaxSubtotal;
        if (max != null && max !== '') {
            if (!isNum(max) || max <= orderTiers[orderTiers.length - 1].minSubtotal) {
                return { config: null, error: 'orderMaxSubtotal must be a number above the last order tier start' };
            }
            config.orderMaxSubtotal = max;
        }
    }
    if (input.mode !== 'order') {
        const { distanceSlabs, error } = normaliseDistanceSlabs(input.distanceSlabs);
        if (error) return { config: null, error };
        config.distanceSlabs = distanceSlabs;
    }
    return { config, error: null };
};

const orderTierFee = (tiers, subtotal) => {
    const amount = Number(subtotal) || 0;
    let fee = tiers[0].fee;
    for (const tier of tiers) {
        if (amount >= tier.minSubtotal) fee = tier.fee;
    }
    return fee;
};

// Unknown distance charges the first slab; beyond the last slab charges the last
const distanceSlabFee = (slabs, distanceKm) => {
    if (distanceKm == null) return slabs[0].fee;
    const slab = slabs.find(s => distanceKm <= s.uptoKm) || slabs[slabs.length - 1];
    return slab.fee;
};

/**
 * Computes the delivery fee for an order at a branch.
 * @param {Object} p
 * @param {Object} p.branch   Branch (needs latitude, longitude, deliveryFeeConfig)
 * @param {number} p.subtotal Order-value amount: after offer discount, before GST
 * @param {number} [p.lat]    Delivery latitude
 * @param {number} [p.lng]    Delivery longitude
 * @returns {{ fee: number, distanceKm: number|null }}
 */
const calculateDeliveryFee = ({ branch, subtotal, lat, lng }) => {
    const { config } = validateDeliveryFeeConfig(branch && branch.deliveryFeeConfig);
    if (!config || !config.enabled) return { fee: 0, distanceKm: null };

    let distanceKm = null;
    if (branch.latitude != null && branch.longitude != null && lat != null && lng != null) {
        distanceKm = calculateDistance(
            parseFloat(branch.latitude), parseFloat(branch.longitude),
            parseFloat(lat), parseFloat(lng)
        );
    }

    if (config.freeAboveSubtotal != null && (Number(subtotal) || 0) >= config.freeAboveSubtotal) {
        return { fee: 0, distanceKm };
    }

    let fee = 0;
    if (config.orderTiers) {
        const beyondMax = config.orderMaxSubtotal != null && (Number(subtotal) || 0) >= config.orderMaxSubtotal;
        if (!beyondMax) fee += orderTierFee(config.orderTiers, subtotal);
    }
    if (config.distanceSlabs) fee += distanceSlabFee(config.distanceSlabs, distanceKm);
    return { fee, distanceKm };
};

module.exports = { calculateDeliveryFee, validateDeliveryFeeConfig };
