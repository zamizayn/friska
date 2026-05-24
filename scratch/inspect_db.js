const { Branch, Tenant, CustomerAddress } = require('./models');

async function run() {
    try {
        console.log("=== TENANTS ===");
        const tenants = await Tenant.findAll();
        for (const t of tenants) {
            console.log(`Tenant #${t.id} Name: ${t.name}, Google Maps API Key: ${t.googleMapsApiKey ? 'SET' : 'NOT SET'} (${t.googleMapsApiKey})`);
        }

        console.log("\n=== BRANCHES ===");
        const branches = await Branch.findAll();
        for (const b of branches) {
            console.log(`Branch #${b.id} Name: ${b.name}, Lat: ${b.latitude}, Lng: ${b.longitude}, Radius: ${b.deliveryRadius}, Address: ${b.address}`);
        }

        console.log("\n=== SAVED ADDRESSES ===");
        const addrs = await CustomerAddress.findAll({ limit: 5, order: [['createdAt', 'DESC']] });
        for (const a of addrs) {
            console.log(`Addr #${a.id} Phone: ${a.customerPhone}, Address: ${a.address}, Lat: ${a.latitude}, Lng: ${a.longitude}`);
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

run();
