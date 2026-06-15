const { generateInvoice } = require('./services/invoiceService');
const fs = require('fs');

const order = {
    id: 61,
    customerName: 'Customer',
    customerPhone: '917012738756',
    address: '288H+2V2, 28/399, Crash Rd, Padamughal, Vazhakkala, Kakkanad, Kochi, Kerala 682021, India',
    createdAt: new Date('2026-05-25T10:00:00Z'),
    paymentMethod: 'Cash on Delivery',
    items: [
        { name: 'Chicken Chilli Special Cut 1 Box (2kg)', quantity: 1, price: 1455 }
    ],
    subtotalBeforeTax: 1455,
    total: 1455,
    gstRate: 0,
    gstAmount: 0,
    discountAmount: 0
};

const tenant = {
    name: 'FRISKA'
};

const branch = {
    name: 'Thamarassery',
    address: 'Crash Rd, next to Noel TouchStone, Vazhakkala, Kakkanad, Kochi, Kerala 682021, India'
};

generateInvoice(order, tenant, branch).then(path => {
    console.log('Invoice generated at:', path);
}).catch(console.error);
