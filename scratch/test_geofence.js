const { Branch } = require('../models');

// Haversine
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const checkDeliveryAvailability = async (session, latitude, longitude) => {
    if (!session.branchId) return { available: true };
    const branch = await Branch.findByPk(session.branchId);
    if (!branch) return { available: true };
    
    if (branch.latitude == null || branch.longitude == null || branch.deliveryRadius == null) {
        return { available: true };
    }
    
    if (latitude == null || longitude == null) {
        return { available: true };
    }
    
    const distance = calculateDistance(
        parseFloat(branch.latitude), 
        parseFloat(branch.longitude), 
        parseFloat(latitude), 
        parseFloat(longitude)
    );
    
    const inRange = distance <= parseFloat(branch.deliveryRadius);
    return {
        available: inRange,
        distance,
        deliveryRadius: branch.deliveryRadius,
        reason: inRange ? null : 'out_of_radius'
    };
};

async function test() {
    const session = { branchId: 2 };
    
    // Test Ernakulam coordinates: 9.9816, 76.2999
    const resErnakulam = await checkDeliveryAvailability(session, 9.9816, 76.2999);
    console.log("Ernakulam Result:", resErnakulam);

    // Test a location in Bangalore (1.5 km away from Bangalore city center): 12.98, 77.60
    const resBangalore = await checkDeliveryAvailability(session, 12.98, 77.60);
    console.log("Bangalore Result:", resBangalore);
}

test().then(() => process.exit(0));
