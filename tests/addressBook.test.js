const test = require('node:test');
const assert = require('node:assert/strict');
const { findSameAddress, buildAddressRows } = require('../utils/addressBook');

// At latitude 12.9, 0.001 degrees of longitude is about 108 m
const addr = (id, over = {}) => ({ id, address: `addr ${id}`, label: 'Saved Address', latitude: null, longitude: null, createdAt: new Date(2026, 0, id), ...over });

test('same address text matches regardless of case and spacing', () => {
    const list = [addr(1, { address: '12 MG Road,  Kochi' })];
    assert.equal(findSameAddress(list, { address: '  12 mg road, kochi ' }).id, 1);
    assert.equal(findSameAddress(list, { address: '14 MG Road, Kochi' }), null);
});

test('shared locations within 50 m are the same place, farther ones are not', () => {
    const list = [addr(1, { address: 'https://maps.google.com/?q=12.9,77.6', latitude: 12.9, longitude: 77.6 })];
    const near = { address: 'https://maps.google.com/?q=12.90001,77.60020', latitude: 12.90001, longitude: 77.6002 };   // ~22 m
    const far = { address: 'https://maps.google.com/?q=12.9,77.601', latitude: 12.9, longitude: 77.601 };               // ~108 m
    assert.equal(findSameAddress(list, near).id, 1);
    assert.equal(findSameAddress(list, far), null);
});

test('string coordinates (DECIMAL columns) and missing coordinates are handled', () => {
    const list = [addr(1, { address: 'a', latitude: '12.90000000', longitude: '77.60000000' })];
    assert.equal(findSameAddress(list, { address: 'b', latitude: 12.9, longitude: 77.6 }).id, 1);
    assert.equal(findSameAddress(list, { address: 'b' }), null);
    assert.equal(findSameAddress([addr(2)], { address: 'b', latitude: 12.9, longitude: 77.6 }), null);
    assert.equal(findSameAddress([], { address: 'b' }), null);
});

test('the list never has more than 10 rows and keeps the 9 newest addresses plus Share Location', () => {
    const many = Array.from({ length: 12 }, (_, i) => addr(i + 1));           // ids 1..12, 12 is newest
    const rows = buildAddressRows(many, { idPrefix: 'cataddress_', newAddressId: 'cataddress_new' });
    assert.equal(rows.length, 10);
    assert.equal(rows[rows.length - 1].id, 'cataddress_new');
    assert.deepEqual(rows.slice(0, 9).map(r => r.id), [12, 11, 10, 9, 8, 7, 6, 5, 4].map(i => `cataddress_${i}`));
});

test('exactly the old failing size (10 saved addresses) now fits', () => {
    const ten = Array.from({ length: 10 }, (_, i) => addr(i + 1));
    assert.equal(buildAddressRows(ten, { idPrefix: 'address_', newAddressId: 'address_new' }).length, 10);
});

test('few addresses are all shown; recently used ones come first', () => {
    const two = [addr(1, { updatedAt: new Date(2026, 5, 1) }), addr(2, { updatedAt: new Date(2026, 2, 1) })];
    const rows = buildAddressRows(two, { idPrefix: 'a_', newAddressId: 'a_new' });
    assert.deepEqual(rows.map(r => r.id), ['a_1', 'a_2', 'a_new']);
});

test('titles fit 24 chars, descriptions fit 72, empty descriptions are left out', () => {
    const rows = buildAddressRows([
        addr(1, { label: 'L'.repeat(40), address: 'D'.repeat(200) }),
        addr(2, { address: '', formattedAddress: null })
    ], { idPrefix: 'a_', newAddressId: 'a_new' });
    const long = rows.find(r => r.id === 'a_1');
    assert.equal(long.title.length, 24);
    assert.equal(long.description.length, 72);
    assert.equal('description' in rows.find(r => r.id === 'a_2'), false);
});
