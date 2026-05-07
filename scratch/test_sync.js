require('dotenv').config();
const { syncProductToMeta } = require('../services/whatsappService');

const testSync = async () => {
    const dummyProduct = {
        id: 999,
        name: 'Test Product ' + Date.now(),
        retailerId: 'test_prod_' + Date.now(),
        description: 'Test Description',
        image: 'https://placehold.co/600x400.png',
        price: 10,
        stock: 100
    };

    const config = {
        catalogId: '4587984068102388',
        whatsappToken: 'EAAQtHRZBtZBAMBRXTyw7PAFsEdS1DZChUaQaa4wGZAVtU8W1XwiNz0FJw86TPx3NZB8bPDdKZBPpg7O4OPEZA0LFyT8BLgLzw1WV9VqYwz0TzAoUjJp1QQ5aLA5piKtRjucL9C5JfAPDsS10qLwOcI453MiGACrpcs8qwrwkTiLzCK2UZBSs05HdAGRMBO7ZBcR035tFC30FQc8kcnpmZBC3SgabDf8gLuidpg5a80ZCaTD'
    };

    try {
        console.log('Testing sync with product:', dummyProduct.retailerId);
        const result = await syncProductToMeta(dummyProduct, config);
        console.log('Sync Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Sync Failed:');
        if (e.response) {
            console.error(JSON.stringify(e.response.data, null, 2));
        } else {
            console.error(e.message);
        }
    }
};

testSync();
