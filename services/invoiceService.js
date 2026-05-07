const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a visually appealing, professional PDF invoice for an order.
 * @param {Object} order - The order object.
 * @param {Object} tenant - The tenant (store) object.
 * @param {Object} branch - The branch object.
 * @returns {Promise<string>} - The absolute path to the generated PDF.
 */
const generateInvoice = async (order, tenant, branch) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                margin: 50,
                size: 'A4',
                bufferPages: true 
            });
            
            const filename = `invoice_${order.id}_${Date.now()}.pdf`;
            const tempDir = path.join(__dirname, '../temp');
            const filePath = path.join(tempDir, filename);
            
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            const primaryColor = '#1e293b'; // Slate 800
            const secondaryColor = '#64748b'; // Slate 500
            const accentColor = '#6366f1'; // Indigo 500
            const borderColor = '#e2e8f0'; // Slate 200

            // --- 1. Header Section ---
            // Draw a decorative top accent
            doc.rect(0, 0, doc.page.width, 15).fill(accentColor);

            doc.fillColor(primaryColor).fontSize(24).text(tenant.name.toUpperCase(), 50, 45, { bold: true });
            
            doc.fontSize(10).fillColor(secondaryColor);
            if (branch) {
                doc.text(branch.name, 50, 75);
                if (branch.address) doc.text(branch.address, 50, 88, { width: 250 });
            }

            // Invoice Label
            doc.fillColor(primaryColor).fontSize(20).text('INVOICE', 400, 45, { align: 'right' });
            doc.fontSize(10).fillColor(secondaryColor).text(`#ORD-${order.id}`, 400, 70, { align: 'right' });

            doc.moveTo(50, 130).lineTo(545, 130).strokeColor(borderColor).stroke();

            // --- 2. Information Grid ---
            const infoY = 150;
            
            // Bill To Column
            doc.fillColor(secondaryColor).fontSize(9).text('BILL TO', 50, infoY);
            doc.fillColor(primaryColor).fontSize(11).text(order.customerName || 'Customer', 50, infoY + 15, { bold: true });
            doc.fillColor(secondaryColor).fontSize(10).text(order.customerPhone, 50, infoY + 30);

            // Order Details Column
            doc.fillColor(secondaryColor).fontSize(9).text('ORDER DATE', 350, infoY);
            doc.fillColor(primaryColor).fontSize(10).text(new Date(order.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'long', day: 'numeric'
            }), 350, infoY + 15);

            doc.fillColor(secondaryColor).fontSize(9).text('PAYMENT STATUS', 480, infoY, { align: 'right' });
            doc.fillColor(accentColor).fontSize(10).text('PAID', 480, infoY + 15, { align: 'right', bold: true });

            doc.moveDown(4);

            // --- 3. Items Table ---
            const tableTop = 240;
            
            // Header Row Background
            doc.rect(50, tableTop, 495, 25).fill('#f8fafc');
            doc.fillColor(primaryColor).fontSize(9);
            
            doc.text('ITEM DESCRIPTION', 60, tableTop + 8, { bold: true });
            doc.text('QTY', 330, tableTop + 8, { bold: true });
            doc.text('UNIT PRICE', 400, tableTop + 8, { bold: true });
            doc.text('TOTAL', 480, tableTop + 8, { align: 'right', bold: true });

            // Table Rows
            let currentY = tableTop + 35;
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            
            items.forEach((item, index) => {
                // Zebra striping
                if (index % 2 === 1) {
                    doc.rect(50, currentY - 5, 495, 20).fill('#fcfcfc');
                }

                doc.fillColor(primaryColor).fontSize(10);
                doc.text(item.name, 60, currentY);
                doc.text(item.quantity.toString(), 330, currentY);
                doc.text(`₹${item.price.toLocaleString('en-IN')}`, 400, currentY);
                doc.text(`₹${(item.price * item.quantity).toLocaleString('en-IN')}`, 480, currentY, { align: 'right' });
                
                currentY += 25;

                // Add Page if needed
                if (currentY > 750) {
                    doc.addPage();
                    currentY = 50;
                }
            });

            // --- 4. Totals Section ---
            doc.moveTo(50, currentY + 10).lineTo(545, currentY + 10).strokeColor(borderColor).stroke();
            currentY += 30;

            const totalLabelX = 350;
            doc.fillColor(secondaryColor).fontSize(10).text('SUBTOTAL', totalLabelX, currentY);
            doc.fillColor(primaryColor).text(`₹${order.total.toLocaleString('en-IN')}`, 480, currentY, { align: 'right' });

            currentY += 20;
            doc.fillColor(secondaryColor).fontSize(10).text('TAX (INCLUDED)', totalLabelX, currentY);
            doc.fillColor(primaryColor).text('₹0.00', 480, currentY, { align: 'right' });

            currentY += 25;
            doc.rect(totalLabelX - 10, currentY - 5, 205, 30).fill(primaryColor);
            doc.fillColor('#ffffff').fontSize(12).text('TOTAL AMOUNT', totalLabelX, currentY + 5, { bold: true });
            doc.text(`₹${order.total.toLocaleString('en-IN')}`, 480, currentY + 5, { align: 'right', bold: true });

            // --- 5. Footer ---
            doc.fillColor(secondaryColor).fontSize(9).text('Thank you for your business!', 50, 780, { align: 'center' });
            doc.text(`${tenant.name} | Automated Invoice`, 50, 792, { align: 'center' });

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', (err) => reject(err));
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = { generateInvoice };
