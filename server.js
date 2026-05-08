require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { Op } = require('sequelize');
const { CustomerLog } = require('./models');

const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin/index');
const paymentRoutes = require('./routes/payment');
// const appRoutes = require('./app/routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('WhatsApp Store Backend Running 🚀');
});

app.use('/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
// app.use('/api/app', appRoutes);
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});