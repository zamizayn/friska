'use strict';

// Moves the launch switch from the LAUNCHED / LAUNCHED_MESSAGE env vars into GlobalConfigs
// (editable under Platform Settings). The current env values are copied once, so a shop that
// is "not launched" today stays that way after the switch. Existing rows are never overwritten.
const DEFAULT_MESSAGE = "We're currently preparing for launch! 🚀 Orders are not yet available. Please check back with us soon!";

module.exports = {
  up: async (queryInterface) => {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT "key" FROM "GlobalConfigs" WHERE "key" IN ('launched', 'launchedMessage')`
    );
    const have = new Set(existing.map(r => r.key));
    const now = new Date();
    const rows = [];
    if (!have.has('launched')) {
      const launched = String(process.env.LAUNCHED ?? 'true').trim().toLowerCase() !== 'false';
      rows.push({ key: 'launched', value: launched ? 'true' : 'false', createdAt: now, updatedAt: now });
    }
    if (!have.has('launchedMessage')) {
      rows.push({ key: 'launchedMessage', value: (process.env.LAUNCHED_MESSAGE || '').trim() || DEFAULT_MESSAGE, createdAt: now, updatedAt: now });
    }
    if (rows.length) await queryInterface.bulkInsert('GlobalConfigs', rows);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('GlobalConfigs', { key: ['launched', 'launchedMessage'] });
  }
};
