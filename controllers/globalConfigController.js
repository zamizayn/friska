const { GlobalConfig } = require('../models');
const { clearLaunchCache } = require('../services/launchService');

const getConfigs = async (req, res) => {
    try {
        const configs = await GlobalConfig.findAll();
        const configMap = {};
        configs.forEach(c => {
            configMap[c.key] = c.value;
        });
        res.json(configMap);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateConfigs = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Access denied' });
        
        const updates = { ...req.body }; // { key: value, ... }

        // The launch switch is stored as the strings 'true' / 'false'
        if ('launched' in updates) {
            const v = String(updates.launched).trim().toLowerCase();
            if (v !== 'true' && v !== 'false') return res.status(400).json({ error: "launched must be 'true' or 'false'" });
            updates.launched = v;
        }
        if ('launchedMessage' in updates) updates.launchedMessage = String(updates.launchedMessage ?? '').trim();

        for (const [key, value] of Object.entries(updates)) {
            await GlobalConfig.upsert({ key, value });
        }
        clearLaunchCache();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = { getConfigs, updateConfigs };
