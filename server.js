require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { CustomerLog, Branch } = require('./models');

const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin/index');
const paymentRoutes = require('./routes/payment');
const appRoutes = require('./routes/app/index');
const deliveryRoutes = require('./routes/delivery/index');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.send('WhatsApp Store Backend Running 🚀');
});

app.use('/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/app', appRoutes);
app.use('/api/delivery', deliveryRoutes);
const PORT = process.env.PORT || 3000;

// Schedule cron job to run every day at midnight to purge logs older than 7 days
cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running daily purge of old Customer Activity Logs...');
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const deletedCount = await CustomerLog.destroy({
            where: {
                createdAt: {
                    [Op.lt]: sevenDaysAgo
                }
            }
        });
        console.log(`[Cron] Purged ${deletedCount} old log(s).`);
    } catch (e) {
        console.error('[Cron] Error purging old logs:', e.message);
    }
});

// Schedule cron job to auto-reopen branches when closedUntil time has passed
cron.schedule('* * * * *', async () => {
    try {
        const closedBranches = await Branch.findAll({
            where: { isOpen: false, closedUntil: { [Op.ne]: null } }
        });
        if (closedBranches.length === 0) return;
        const now = moment().tz('Asia/Kolkata').format('HH:mm');
        let reopened = 0;
        for (const branch of closedBranches) {
            if (now >= branch.closedUntil) {
                await branch.update({ isOpen: true, closedUntil: null });
                reopened++;
            }
        }
        if (reopened > 0) {
            console.log(`[Cron] Auto-reopened ${reopened} branch(es) at ${now} IST`);
        }
    } catch (e) {
        console.error('[Cron] Error auto-reopening branches:', e.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});