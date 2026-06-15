const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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

            const primaryColor = '#1e293b';
            const secondaryColor = '#64748b';
            const accentColor = '#6366f1';
            const borderColor = '#e2e8f0';

            // --- 1. Header Section ---
            doc.rect(0, 0, doc.page.width, 15).fill(accentColor);

            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(24).text(tenant.name.toUpperCase(), 50, 45);

            doc.font('Helvetica').fontSize(10).fillColor(secondaryColor);
            if (branch) {
                doc.text(branch.name, 50, 75);
                if (branch.address) doc.text(branch.address, 50, 88, { width: 250 });
            }

            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(20).text('INVOICE', 400, 45, { align: 'right' });
            doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text(`#ORD-${order.id}`, 400, 70, { align: 'right' });

            doc.moveTo(50, 130).lineTo(545, 130).strokeColor(borderColor).stroke();

            // --- 2. Information Grid ---
            const infoY = 150;

            // Bill To Column
            doc.font('Helvetica').fillColor(secondaryColor).fontSize(9).text('BILL TO', 50, infoY);
            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(11).text(order.customerName || 'Customer', 50, infoY + 15);
            doc.font('Helvetica').fillColor(secondaryColor).fontSize(10).text(order.customerPhone, 50, infoY + 30);

            // Address
            const addr = order.formattedAddress || order.address;
            if (addr) {
                doc.font('Helvetica').fillColor(secondaryColor).fontSize(9).text(addr, 50, infoY + 47, { width: 250 });
            }

            // Order Details Column
            const detailX = 340;
            let detailY = infoY;

            doc.font('Helvetica').fillColor(secondaryColor).fontSize(9).text('ORDER DATE', detailX, detailY);
            doc.font('Helvetica').fillColor(primaryColor).fontSize(10).text(
                new Date(order.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'long', day: 'numeric'
                }), detailX, detailY + 15
            );

            detailY += 40;

            if (order.paymentMethod) {
                doc.font('Helvetica').fillColor(secondaryColor).fontSize(9).text('PAYMENT METHOD', detailX, detailY);
                doc.font('Helvetica').fillColor(primaryColor).fontSize(10).text(order.paymentMethod, detailX, detailY + 15);
                detailY += 35;
            }

            if (order.paymentTransactionId) {
                doc.font('Helvetica').fillColor(secondaryColor).fontSize(9).text('TRANSACTION ID', detailX, detailY);
                doc.font('Helvetica').fillColor(primaryColor).fontSize(9).text(order.paymentTransactionId, detailX, detailY + 15);
                detailY += 35;
            }

            // Payment Status (right-aligned)
            doc.font('Helvetica').fillColor(secondaryColor).fontSize(9).text('PAYMENT STATUS', 480, infoY, { align: 'right' });
            doc.font('Helvetica-Bold').fillColor(accentColor).fontSize(10).text('PAID', 480, infoY + 15, { align: 'right' });

            // --- 3. Items Table ---
            const hasAddress = !!(order.formattedAddress || order.address);
            const hasTxnId = !!order.paymentTransactionId;
            let tableTop = 240;
            if (hasAddress && hasTxnId) tableTop = 275;
            else if (hasAddress || hasTxnId) tableTop = 255;

            // Header Row Background
            doc.rect(50, tableTop, 495, 25).fill('#f8fafc');

            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(9);
            doc.text('ITEM DESCRIPTION', 60, tableTop + 8);
            doc.text('QTY', 330, tableTop + 8);
            doc.text('UNIT PRICE', 380, tableTop + 8);
            doc.text('TOTAL', 470, tableTop + 8, { align: 'right' });

            // Table Rows
            let currentY = tableTop + 35;
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

            items.forEach((item, index) => {
                // Zebra striping
                if (index % 2 === 1) {
                    doc.rect(50, currentY - 5, 495, 20).fill('#fcfcfc');
                }

                doc.font('Helvetica').fillColor(primaryColor).fontSize(10);
                doc.text(item.name, 60, currentY, { width: 255 });
                doc.text(item.quantity.toString(), 330, currentY, { width: 40, align: 'center' });
                doc.text(`₹${item.price.toLocaleString('en-IN')}`, 380, currentY, { width: 80, align: 'right' });
                doc.text(`₹${(item.price * item.quantity).toLocaleString('en-IN')}`, 470, currentY, { width: 65, align: 'right' });

                currentY += 25;

                if (currentY > 730) {
                    doc.addPage();
                    currentY = 50;
                }
            });

            // --- 4. Totals Section ---
            currentY += 10;
            doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor(borderColor).stroke();
            currentY += 20;

            const gstRate = order.gstRate || 0;
            const gstAmount = order.gstAmount || 0;
            const subtotal = order.subtotalBeforeTax || order.total;
            const totalLabelX = 350;

            doc.font('Helvetica').fillColor(secondaryColor).fontSize(10).text('SUBTOTAL', totalLabelX, currentY);
            doc.font('Helvetica').fillColor(primaryColor).text(`₹${subtotal.toLocaleString('en-IN')}`, 470, currentY, { align: 'right' });

            currentY += 20;
            if (gstRate > 0) {
                doc.font('Helvetica').fillColor(secondaryColor).fontSize(10).text(`GST (${gstRate}%)`, totalLabelX, currentY);
                doc.font('Helvetica').fillColor(primaryColor).text(`₹${gstAmount.toLocaleString('en-IN')}`, 470, currentY, { align: 'right' });
                currentY += 20;
            }
            if (order.discountAmount > 0) {
                let discountLabel = 'DISCOUNT';
                if (order.appliedOfferCode) {
                    discountLabel += ` (${order.appliedOfferCode})`;
                }
                doc.font('Helvetica').fillColor(secondaryColor).fontSize(10).text(discountLabel, totalLabelX, currentY);
                doc.font('Helvetica').fillColor('#dc2626').text(`-₹${order.discountAmount.toLocaleString('en-IN')}`, 470, currentY, { align: 'right' });
                currentY += 20;
            }

            if (gstRate > 0) {
                doc.font('Helvetica').fillColor(secondaryColor).fontSize(10).text('TAX (INCLUDED)', totalLabelX, currentY);
                doc.font('Helvetica').fillColor(primaryColor).text('₹0.00', 470, currentY, { align: 'right' });
                currentY += 25;
            } else {
                currentY += 5;
            }

            // Total Amount box
            doc.rect(totalLabelX - 10, currentY - 5, 205, 30).fill(primaryColor);
            doc.font('Helvetica-Bold').fillColor('#ffffff').fontSize(12).text('TOTAL AMOUNT', totalLabelX, currentY + 5);
            doc.text(`₹${order.total.toLocaleString('en-IN')}`, 470, currentY + 5, { align: 'right' });

            // --- 5. Footer ---
            currentY += 50;
            if (currentY > 750) {
                doc.addPage();
                currentY = 50;
            }
            doc.font('Helvetica').fillColor(secondaryColor).fontSize(9).text('Thank you for your business!', 50, currentY, { align: 'center' });
            doc.text(`${tenant.name} | Automated Invoice`, 50, currentY + 12, { align: 'center' });

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', (err) => reject(err));
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = { generateInvoice };
