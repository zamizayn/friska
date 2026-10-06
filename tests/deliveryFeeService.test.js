const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDeliveryFee, validateDeliveryFeeConfig } = require('../services/deliveryFeeService');

// At latitude 12.9, 0.01 degrees of longitude is about 1.08 km
const BRANCH = { latitude: 12.9, longitude: 77.6 };
const at = (kmEast) => ({ lat: 12.9, lng: 77.6 + kmEast / 108 });
const branch = (deliveryFeeConfig) => ({ ...BRANCH, deliveryFeeConfig });

const orderConfig = (extra = {}) => ({
    mode: 'order',
    orderTiers: [{ minSubtotal: 0, fee: 40 }, { minSubtotal: 300, fee: 20 }, { minSubtotal: 500, fee: 0 }],
    ...extra
});
const distanceConfig = (extra = {}) => ({
    mode: 'distance',
    distanceSlabs: [{ uptoKm: 2, fee: 20 }, { uptoKm: 5, fee: 40 }, { uptoKm: 10, fee: 70 }],
    ...extra
});

test('order mode: picks the highest tier at or below the subtotal', () => {
    const b = branch(orderConfig());
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: 0 }).fee, 40);
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: 299.99 }).fee, 40);
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: 300 }).fee, 20);
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: 499 }).fee, 20);
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: 500 }).fee, 0);
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: 10000 }).fee, 0);
});

test('order mode: tiers stored out of order still work', () => {
    const { config } = validateDeliveryFeeConfig(orderConfig({
        orderTiers: [{ minSubtotal: 500, fee: 0 }, { minSubtotal: 0, fee: 40 }, { minSubtotal: 300, fee: 20 }]
    }));
    assert.equal(calculateDeliveryFee({ branch: branch(config), subtotal: 350 }).fee, 20);
});

test('order mode: bad subtotal falls back to the first tier', () => {
    const b = branch(orderConfig());
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: undefined }).fee, 40);
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: NaN }).fee, 40);
});

test('order mode: still reports distance when coordinates are known', () => {
    const { distanceKm } = calculateDeliveryFee({ branch: branch(orderConfig()), subtotal: 100, ...at(3) });
    assert.ok(Math.abs(distanceKm - 3) < 0.1, `distance was ${distanceKm}`);
});

test('distance mode: picks the first slab that covers the distance', () => {
    const b = branch(distanceConfig());
    assert.equal(calculateDeliveryFee({ branch: b, ...at(1) }).fee, 20);
    assert.equal(calculateDeliveryFee({ branch: b, ...at(1.9) }).fee, 20);
    assert.equal(calculateDeliveryFee({ branch: b, ...at(2.1) }).fee, 40);
    assert.equal(calculateDeliveryFee({ branch: b, ...at(4.9) }).fee, 40);
    assert.equal(calculateDeliveryFee({ branch: b, ...at(5.1) }).fee, 70);
});

test('distance mode: at the branch itself uses the first slab', () => {
    const r = calculateDeliveryFee({ branch: branch(distanceConfig()), lat: 12.9, lng: 77.6 });
    assert.equal(r.fee, 20);
    assert.equal(r.distanceKm, 0);
});

test('distance mode: beyond the last slab charges the last slab fee', () => {
    assert.equal(calculateDeliveryFee({ branch: branch(distanceConfig()), ...at(25) }).fee, 70);
});

test('distance mode: missing coordinates charge the first slab', () => {
    const b = branch(distanceConfig());
    const noCustomer = calculateDeliveryFee({ branch: b });
    assert.equal(noCustomer.fee, 20);
    assert.equal(noCustomer.distanceKm, null);
    assert.equal(calculateDeliveryFee({ branch: { deliveryFeeConfig: distanceConfig() }, ...at(3) }).fee, 20);
});

test('distance mode: accepts string coordinates (DECIMAL columns come back as strings)', () => {
    const b = { latitude: '12.90000000', longitude: '77.60000000', deliveryFeeConfig: distanceConfig() };
    assert.equal(calculateDeliveryFee({ branch: b, lat: '12.9', lng: String(77.6 + 3 / 108) }).fee, 40);
});

test('both mode: order tier fee and distance slab fee are added together', () => {
    const b = branch({
        mode: 'both',
        orderTiers: [{ minSubtotal: 0, fee: 20 }, { minSubtotal: 500, fee: 0 }],
        distanceSlabs: [{ uptoKm: 2, fee: 20 }, { uptoKm: 5, fee: 40 }]
    });
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: 200, ...at(3) }).fee, 60);   // 20 + 40
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: 200, ...at(1) }).fee, 40);   // 20 + 20
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: 500, ...at(3) }).fee, 40);   // 0 + 40
    assert.equal(calculateDeliveryFee({ branch: b, subtotal: 500, ...at(1) }).fee, 20);   // 0 + 20
});

test('both mode: missing coordinates add the first slab fee; disabled gives 0', () => {
    const cfg = {
        mode: 'both',
        orderTiers: [{ minSubtotal: 0, fee: 20 }],
        distanceSlabs: [{ uptoKm: 2, fee: 15 }, { uptoKm: 5, fee: 40 }]
    };
    assert.equal(calculateDeliveryFee({ branch: branch(cfg), subtotal: 100 }).fee, 35);
    assert.equal(calculateDeliveryFee({ branch: branch({ ...cfg, enabled: false }), subtotal: 100, ...at(3) }).fee, 0);
});

test('both mode: validation needs both lists and keeps both when valid', () => {
    const tiers = [{ minSubtotal: 0, fee: 20 }];
    const slabs = [{ uptoKm: 2, fee: 15 }];
    assert.ok(validateDeliveryFeeConfig({ mode: 'both', orderTiers: tiers }).error);
    assert.ok(validateDeliveryFeeConfig({ mode: 'both', distanceSlabs: slabs }).error);
    const { config, error } = validateDeliveryFeeConfig({ mode: 'both', orderTiers: tiers, distanceSlabs: slabs });
    assert.equal(error, null);
    assert.deepEqual(config, { enabled: true, mode: 'both', orderTiers: tiers, distanceSlabs: slabs });
});

test('order and distance modes drop the unused list when normalised', () => {
    const tiers = [{ minSubtotal: 0, fee: 20 }];
    const slabs = [{ uptoKm: 2, fee: 15 }];
    const o = validateDeliveryFeeConfig({ mode: 'order', orderTiers: tiers, distanceSlabs: slabs }).config;
    assert.equal(o.distanceSlabs, undefined);
    const d = validateDeliveryFeeConfig({ mode: 'distance', orderTiers: tiers, distanceSlabs: slabs }).config;
    assert.equal(d.orderTiers, undefined);
});

test('free above: orders at or above the threshold pay nothing in every mode', () => {
    const modes = [
        orderConfig(),
        distanceConfig(),
        { mode: 'both', orderTiers: [{ minSubtotal: 0, fee: 20 }], distanceSlabs: [{ uptoKm: 5, fee: 40 }] }
    ];
    for (const cfg of modes) {
        const b = branch({ ...cfg, freeAboveSubtotal: 400 });
        assert.equal(calculateDeliveryFee({ branch: b, subtotal: 400, ...at(3) }).fee, 0, cfg.mode);
        assert.equal(calculateDeliveryFee({ branch: b, subtotal: 1000, ...at(3) }).fee, 0, cfg.mode);
        assert.ok(calculateDeliveryFee({ branch: b, subtotal: 399.99, ...at(3) }).fee > 0, cfg.mode);
    }
});

test('free above: still reports distance, and is ignored when disabled or unset', () => {
    const free = calculateDeliveryFee({ branch: branch(distanceConfig({ freeAboveSubtotal: 400 })), subtotal: 500, ...at(3) });
    assert.equal(free.fee, 0);
    assert.ok(Math.abs(free.distanceKm - 3) < 0.1);
    assert.equal(calculateDeliveryFee({ branch: branch(distanceConfig({ freeAboveSubtotal: 400, enabled: false })), subtotal: 100, ...at(3) }).fee, 0);
    assert.equal(calculateDeliveryFee({ branch: branch(distanceConfig()), subtotal: 100000, ...at(3) }).fee, 40);
});

test('free above: validation accepts empty values and rejects bad ones', () => {
    for (const v of [undefined, null, '']) {
        const { config, error } = validateDeliveryFeeConfig(orderConfig({ freeAboveSubtotal: v }));
        assert.equal(error, null);
        assert.equal(config.freeAboveSubtotal, undefined);
    }
    assert.equal(validateDeliveryFeeConfig(orderConfig({ freeAboveSubtotal: 400 })).config.freeAboveSubtotal, 400);
    for (const v of [0, -5, '400', NaN, Infinity]) {
        assert.ok(validateDeliveryFeeConfig(orderConfig({ freeAboveSubtotal: v })).error, String(v));
    }
});

test('no config, null branch or disabled config means no fee', () => {
    assert.deepEqual(calculateDeliveryFee({ branch: branch(null), subtotal: 100 }), { fee: 0, distanceKm: null });
    assert.deepEqual(calculateDeliveryFee({ branch: null, subtotal: 100 }), { fee: 0, distanceKm: null });
    assert.deepEqual(calculateDeliveryFee({ branch: {}, subtotal: 100 }), { fee: 0, distanceKm: null });
    assert.equal(calculateDeliveryFee({ branch: branch(orderConfig({ enabled: false })), subtotal: 100 }).fee, 0);
    assert.equal(calculateDeliveryFee({ branch: branch(distanceConfig({ enabled: false })), ...at(3) }).fee, 0);
});

test('enabled defaults to true and can be turned back on without losing tiers', () => {
    assert.equal(calculateDeliveryFee({ branch: branch(orderConfig()), subtotal: 100 }).fee, 40);
    assert.equal(calculateDeliveryFee({ branch: branch(orderConfig({ enabled: true })), subtotal: 100 }).fee, 40);
    const { config } = validateDeliveryFeeConfig(orderConfig({ enabled: false }));
    assert.equal(config.enabled, false);
    assert.equal(config.orderTiers.length, 3);
});

test('validate: null, undefined and empty string are valid and mean no fee', () => {
    for (const v of [null, undefined, '']) {
        assert.deepEqual(validateDeliveryFeeConfig(v), { config: null, error: null });
    }
});

test('validate: normalises and sorts a valid config', () => {
    const { config, error } = validateDeliveryFeeConfig({
        mode: 'distance',
        junk: 'dropped',
        distanceSlabs: [{ uptoKm: 5, fee: 40, extra: 1 }, { uptoKm: 2, fee: 20 }]
    });
    assert.equal(error, null);
    assert.deepEqual(config, {
        enabled: true,
        mode: 'distance',
        distanceSlabs: [{ uptoKm: 2, fee: 20 }, { uptoKm: 5, fee: 40 }]
    });
});

test('validate: rejects bad shapes', () => {
    const bad = [
        'order',
        { mode: 'flat' },
        { mode: 'order' },
        { mode: 'order', orderTiers: [] },
        { mode: 'order', orderTiers: [{ minSubtotal: 100, fee: 10 }] },        // first tier must start at 0
        { mode: 'order', orderTiers: [{ minSubtotal: 0, fee: -1 }] },
        { mode: 'order', orderTiers: [{ minSubtotal: 0, fee: '10' }] },        // strings are not numbers
        { mode: 'order', orderTiers: [{ minSubtotal: 0 }] },
        { mode: 'distance' },
        { mode: 'distance', distanceSlabs: [] },
        { mode: 'distance', distanceSlabs: [{ uptoKm: 0, fee: 10 }] },
        { mode: 'distance', distanceSlabs: [{ uptoKm: 2, fee: Infinity }] },
        { mode: 'distance', distanceSlabs: [null] },
        { ...orderConfig(), enabled: 'yes' }
    ];
    for (const input of bad) {
        const { config, error } = validateDeliveryFeeConfig(input);
        assert.equal(config, null, JSON.stringify(input));
        assert.ok(error, `expected an error for ${JSON.stringify(input)}`);
    }
});
