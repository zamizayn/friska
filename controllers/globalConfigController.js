const { GlobalConfig } = require('../models');

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
        
        const updates = req.body; // { key: value, ... }
        for (const [key, value] of Object.entries(updates)) {
            await GlobalConfig.upsert({ key, value });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = { getConfigs, updateConfigs };
