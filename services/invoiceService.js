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

            // Modern color palette
            const primaryColor = '#0f172a';    // Slate 900
            const secondaryColor = '#64748b';  // Slate 500
            const accentColor = '#2563eb';     // Blue 600
            const borderColor = '#e2e8f0';     // Slate 200
            const lightBg = '#f8fafc';         // Slate 50

            // --- 1. Header Section ---
            // Top Accent Bar
            doc.rect(0, 0, doc.page.width, 12).fill(accentColor);

            // Tenant Name / Logo & Branch Info
            const logoPath = path.join(__dirname, '../wstore_admin/src/assets/logo.png');
            let logoExists = false;
            try {
                if (fs.existsSync(logoPath)) {
                    logoExists = true;
                }
            } catch (e) { }

            let branchY = 75;
            if (logoExists) {
                // Add logo
                doc.image(logoPath, 50, 35, { height: 40 });
                branchY = 85;
            } else {
                doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(26).text(tenant.name.toUpperCase(), 50, 45);
            }

            doc.font('Helvetica').fontSize(10).fillColor(secondaryColor);
            if (branch) {
                doc.font('Helvetica-Bold').text(branch.name, 50, branchY);
                if (branch.address) {
                    doc.font('Helvetica').text(branch.address, 50, branchY + 14, { width: 250, lineGap: 2 });
                }
            }

            // Invoice Title & Number
            doc.font('Helvetica-Bold').fillColor(accentColor).fontSize(24).text('INVOICE', 400, 45, { align: 'right', width: 145 });
            doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor).text(`#ORD-${order.id}`, 400, 75, { align: 'right', width: 145 });

            // Decorative Divider
            doc.moveTo(50, 140).lineTo(545, 140).lineWidth(1).strokeColor(borderColor).stroke();

            // --- 2. Information Grid ---
            const infoY = 165;

            // Bill To Column
            doc.font('Helvetica-Bold').fillColor(secondaryColor).fontSize(10).text('BILL TO', 50, infoY);
            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12).text(order.customerName || 'Customer', 50, infoY + 18);
            doc.font('Helvetica').fillColor(secondaryColor).fontSize(10).text(order.customerPhone, 50, infoY + 34);

            const addr = order.formattedAddress || order.address;
            if (addr) {
                doc.font('Helvetica').fillColor(secondaryColor).fontSize(10).text(addr, 50, infoY + 50, { width: 220, lineGap: 2 });
            }

            // Order Details Column
            const detailX = 300;
            let detailY = infoY;

            doc.font('Helvetica-Bold').fillColor(secondaryColor).fontSize(10).text('ORDER DETAILS', detailX, detailY);

            detailY += 18;
            doc.font('Helvetica').fillColor(secondaryColor).fontSize(10).text('Date:', detailX, detailY);
            const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            doc.font('Helvetica-Bold').fillColor(primaryColor).text(formattedDate, detailX + 45, detailY);

            if (order.paymentMethod) {
                detailY += 18;
                doc.font('Helvetica').fillColor(secondaryColor).fontSize(10).text('Method:', detailX, detailY);
                doc.font('Helvetica-Bold').fillColor(primaryColor).text(order.paymentMethod, detailX + 45, detailY);
            }

            if (order.paymentTransactionId) {
                detailY += 18;
                doc.font('Helvetica').fillColor(secondaryColor).fontSize(10).text('Txn ID:', detailX, detailY);
                doc.font('Helvetica-Bold').fillColor(primaryColor).text(order.paymentTransactionId, detailX + 45, detailY);
            }

            // Payment Status Column (Right Aligned)
            const statusX = 460;
            doc.font('Helvetica-Bold').fillColor(secondaryColor).fontSize(10).text('PAYMENT STATUS', statusX, infoY, { align: 'right', width: 85 });
            doc.font('Helvetica-Bold').fillColor(accentColor).fontSize(12).text('PAID', statusX, infoY + 18, { align: 'right', width: 85 });

            // --- 3. Items Table ---
            const hasAddress = !!(order.formattedAddress || order.address);
            const hasTxnId = !!order.paymentTransactionId;
            let tableTop = 270;
            if (hasAddress && hasTxnId) tableTop = 295;
            else if (hasAddress || hasTxnId) tableTop = 285;

            // Table Header Background
            doc.rect(50, tableTop, 495, 30).fill(lightBg);
            doc.moveTo(50, tableTop).lineTo(545, tableTop).lineWidth(1).strokeColor(borderColor).stroke();
            doc.moveTo(50, tableTop + 30).lineTo(545, tableTop + 30).lineWidth(1).strokeColor(borderColor).stroke();

            // Table Header Text
            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(10);
            doc.text('ITEM DESCRIPTION', 65, tableTop + 10);
            doc.text('QTY', 340, tableTop + 10, { width: 30, align: 'center' });
            doc.text('UNIT PRICE', 380, tableTop + 10, { width: 70, align: 'right' });
            doc.text('TOTAL', 460, tableTop + 10, { width: 70, align: 'right' });

            // Table Rows
            let currentY = tableTop + 45;
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

            items.forEach((item, index) => {
                doc.font('Helvetica').fillColor(primaryColor).fontSize(10);

                const itemName = item.name || 'Item';
                const qty = item.quantity ? item.quantity.toString() : '1';
                const priceStr = `Rs. ${parseFloat(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                const totalStr = `Rs. ${(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

                // Calculate item name height to adjust row height
                const nameHeight = doc.heightOfString(itemName, { width: 260 });

                doc.text(itemName, 65, currentY, { width: 260, lineGap: 2 });
                doc.text(qty, 340, currentY, { width: 30, align: 'center' });
                doc.text(priceStr, 380, currentY, { width: 70, align: 'right' });
                doc.text(totalStr, 460, currentY, { width: 70, align: 'right' });

                currentY += nameHeight + 15;

                // Add a faint line between items
                if (index < items.length - 1) {
                    doc.moveTo(50, currentY - 7).lineTo(545, currentY - 7).lineWidth(0.5).strokeColor(borderColor).stroke();
                }

                if (currentY > 700) {
                    doc.addPage();
                    currentY = 50;
                }
            });

            // Table Bottom Border
            doc.moveTo(50, currentY - 5).lineTo(545, currentY - 5).lineWidth(1).strokeColor(borderColor).stroke();

            // --- 4. Totals Section ---
            currentY += 15;

            const gstRate = order.gstRate || 0;
            const gstAmount = order.gstAmount || 0;
            const subtotal = order.subtotalBeforeTax || order.total;
            const totalLabelX = 360;
            const totalValueX = 445;

            doc.font('Helvetica').fillColor(secondaryColor).fontSize(10).text('Subtotal', totalLabelX, currentY);
            doc.font('Helvetica-Bold').fillColor(primaryColor).text(`Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalValueX, currentY, { align: 'right', width: 100 });

            currentY += 22;
            if (gstRate > 0) {
                doc.font('Helvetica').fillColor(secondaryColor).text(`GST (${gstRate}%)`, totalLabelX, currentY);
                doc.font('Helvetica-Bold').fillColor(primaryColor).text(`Rs. ${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalValueX, currentY, { align: 'right', width: 100 });
                currentY += 22;
            }
            if (order.discountAmount > 0) {
                let discountLabel = 'Discount';
                if (order.appliedOfferCode) {
                    discountLabel += ` (${order.appliedOfferCode})`;
                }
                doc.font('Helvetica').fillColor(secondaryColor).text(discountLabel, totalLabelX, currentY);
                doc.font('Helvetica-Bold').fillColor('#ef4444').text(`-Rs. ${order.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalValueX, currentY, { align: 'right', width: 100 });
                currentY += 22;
            }

            if (gstRate > 0) {
                doc.font('Helvetica-Oblique').fillColor(secondaryColor).fontSize(9).text('Tax is included in the total price', totalLabelX, currentY);
                currentY += 20;
            }

            // Total Amount box
            doc.rect(totalLabelX - 15, currentY, 200, 36).fill(lightBg);
            doc.moveTo(totalLabelX - 15, currentY).lineTo(545, currentY).lineWidth(2).strokeColor(primaryColor).stroke();

            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12).text('TOTAL AMOUNT', totalLabelX, currentY + 12);
            doc.font('Helvetica-Bold').fillColor(accentColor).fontSize(14).text(`Rs. ${order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalValueX, currentY + 11, { align: 'right', width: 100 });

            // --- 5. Footer ---
            const footerY = doc.page.height - 80;

            doc.moveTo(50, footerY - 15).lineTo(545, footerY - 15).lineWidth(1).strokeColor(borderColor).stroke();

            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(10).text('Thank you for your business!', 50, footerY, { align: 'center' });
            doc.font('Helvetica').fillColor(secondaryColor).fontSize(9).text(`${tenant.name} | Automated Invoice`, 50, footerY + 15, { align: 'center' });

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', (err) => reject(err));
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = { generateInvoice };
