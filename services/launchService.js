const { Op } = require('sequelize');
const { GlobalConfig } = require('../models');

// Launch switch, managed by the superadmin under Platform Settings (GlobalConfig keys
// `launched` and `launchedMessage`). While not launched the shop counts as closed: the
// WhatsApp bot answers with the message instead of the menu and blocks ordering.
const DEFAULT_MESSAGE = "We're currently preparing for launch! 🚀 Orders are not yet available. Please check back with us soon!";
const CACHE_MS = 10 * 1000;
const KEYS = ['launched', 'launchedMessage'];

let cache = null;

// Anything other than the word "false" means launched, so a missing setting leaves the shop open
const parseLaunched = (value) => String(value ?? 'true').trim().toLowerCase() !== 'false';

const getLaunchStatus = async () => {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
    try {
        const rows = await GlobalConfig.findAll({ where: { key: { [Op.in]: KEYS } } });
        const byKey = Object.fromEntries(rows.map(r => [r.key, r.value]));
        const value = {
            launched: parseLaunched(byKey.launched),
            message: String(byKey.launchedMessage ?? '').trim() || DEFAULT_MESSAGE
        };
        cache = { at: Date.now(), value };
        return value;
    } catch (e) {
        // If the settings can't be read, keep the last known state, or stay open
        console.error('[Launch] Could not read launch settings:', e.message);
        return cache ? cache.value : { launched: true, message: DEFAULT_MESSAGE };
    }
};

// Called after the superadmin saves, so this instance picks the change up immediately
const clearLaunchCache = () => { cache = null; };

module.exports = { getLaunchStatus, clearLaunchCache, parseLaunched, DEFAULT_MESSAGE };
