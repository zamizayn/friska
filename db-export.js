const fs = require('fs');
const path = require('path');
const { 
    Tenant, 
    Branch, 
    Admin, 
    Category, 
    Product, 
    Customer, 
    Order, 
    Notification, 
    CustomerLog, 
    FcmToken 
} = require('./models');

async function exportDatabase() {
    console.log('🚀 Starting Database Export...');
    
    try {
        const data = {
            tenants: await Tenant.findAll({ raw: true }),
            branches: await Branch.findAll({ raw: true }),
            admins: await Admin.findAll({ raw: true }),
            categories: await Category.findAll({ raw: true }),
            products: await Product.findAll({ raw: true }),
            customers: await Customer.findAll({ raw: true }),
            orders: await Order.findAll({ raw: true }),
            notifications: await Notification.findAll({ raw: true }),
            customerLogs: await CustomerLog.findAll({ raw: true }),
            fcmTokens: await FcmToken.findAll({ raw: true })
        };

        const backupPath = path.join(__dirname, 'db-backup.json');
        fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
        
        console.log('✅ Export Complete!');
        console.log(`📂 File saved to: ${backupPath}`);
        console.log('-----------------------------------');
        Object.keys(data).forEach(key => {
            console.log(`${key}: ${data[key].length} records`);
        });
    } catch (error) {
        console.error('❌ Export Failed:', error.message);
    } finally {
        process.exit();
    }
}

exportDatabase();
