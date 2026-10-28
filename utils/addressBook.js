const { calculateDistance } = require('./distance');

// WhatsApp list messages allow at most 10 rows in total
const MAX_LIST_ROWS = 10;
// Two saved locations this close count as the same place
const SAME_PLACE_KM = 0.05;

const normalise = (text) => String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const hasCoords = (lat, lng) =>
    lat != null && lng != null && Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng));

/**
 * Finds a saved address that is the same place as a new one: identical text, or (when both have
 * coordinates) within SAME_PLACE_KM. Shared GPS locations are never byte-identical twice, so
 * comparing text alone would save a new row for every order.
 */
const findSameAddress = (existing, { address, latitude, longitude }) => {
    const text = normalise(address);
    const newHasCoords = hasCoords(latitude, longitude);
    return existing.find(a => {
        if (text && normalise(a.address) === text) return true;
        if (newHasCoords && hasCoords(a.latitude, a.longitude)) {
            const km = calculateDistance(parseFloat(a.latitude), parseFloat(a.longitude), parseFloat(latitude), parseFloat(longitude));
            return km != null && km <= SAME_PLACE_KM;
        }
        return false;
    }) || null;
};

const stamp = (a) => new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;

/**
 * Rows for the "where should we deliver?" list: the most recently used addresses, then a
 * Share Location row, never more than 10 rows in total.
 */
const buildAddressRows = (addresses, { idPrefix, newAddressId, max = MAX_LIST_ROWS }) => {
    const newest = [...addresses].sort((a, b) => stamp(b) - stamp(a) || (b.id || 0) - (a.id || 0));
    const rows = newest.slice(0, max - 1).map(addr => {
        const row = { id: `${idPrefix}${addr.id}`, title: String(addr.label || 'Saved Address').slice(0, 24) };
        const description = String(addr.formattedAddress || addr.address || '').slice(0, 72);
        if (description) row.description = description;
        return row;
    });
    rows.push({ id: newAddressId, title: '📍 Share Location', description: 'Share your current location via WhatsApp' });
    return rows;
};

module.exports = { findSameAddress, buildAddressRows, MAX_LIST_ROWS, SAME_PLACE_KM };
