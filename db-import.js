const fs = require('fs');
const path = require('path');
const { 
    sequelize,
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

async function importDatabase() {
    const backupPath = path.join(__dirname, 'db-backup.json');
    
    if (!fs.existsSync(backupPath)) {
        console.error('❌ Error: db-backup.json not found!');
        process.exit(1);
    }

    console.log('🚀 Starting Database Import...');
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    try {
        // Disable foreign key checks for a clean import
        await sequelize.query('SET CONSTRAINTS ALL DEFERRED');
        
        // Define order for insertion to satisfy dependencies
        const models = [
            { name: 'tenants', model: Tenant },
            { name: 'branches', model: Branch },
            { name: 'admins', model: Admin },
            { name: 'categories', model: Category },
            { name: 'products', model: Product },
            { name: 'customers', model: Customer },
            { name: 'orders', model: Order },
            { name: 'notifications', model: Notification },
            { name: 'customerLogs', model: CustomerLog },
            { name: 'fcmTokens', model: FcmToken }
        ];

        for (const item of models) {
            if (data[item.name] && data[item.name].length > 0) {
                console.log(`📥 Importing ${item.name}...`);
                // Clear existing data first
                await item.model.destroy({ where: {}, truncate: { cascade: true } });
                // Bulk insert
                await item.model.bulkCreate(data[item.name]);
                
                // Sync sequences for PostgreSQL auto-incrementing IDs
                const tableName = item.model.getTableName();
                await sequelize.query(`SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM "${tableName}"`);
                
                console.log(`✅ ${item.name} imported (${data[item.name].length} records)`);
            }
        }

        console.log('\n✨ Database Import Successfully Completed!');
    } catch (error) {
        console.error('\n❌ Import Failed:', error.message);
        console.log('Ensure the target database is empty and migrations have been run.');
    } finally {
        process.exit();
    }
}

importDatabase();
