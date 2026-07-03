const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateOrdersReport = async (orders, filters, branch) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4',
                bufferPages: true
            });

            const filename = `orders_report_${Date.now()}.pdf`;
            const tempDir = path.join(__dirname, '../temp');
            const filePath = path.join(tempDir, filename);

            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            const primaryColor = '#0f172a';
            const secondaryColor = '#64748b';
            const accentColor = '#6366f1';
            const successColor = '#10b981';
            const warningColor = '#f59e0b';
            const dangerColor = '#ef4444';
            const borderColor = '#e2e8f0';
            const lightBg = '#f8fafc';

            const completed = orders.filter(o => o.status === 'delivered').length;
            const pending = orders.filter(o => o.status === 'pending' || o.status === 'shipped').length;
            const collected = orders
                .filter(o => o.paymentStatus === 'paid')
                .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
            const pendingCollection = orders
                .filter(o => o.status !== 'cancelled' && o.paymentStatus !== 'paid')
                .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

            const topAccentColor = '#6366f1';
            doc.rect(0, 0, doc.page.width, 12).fill(topAccentColor);

            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(22).text('ORDERS REPORT', 50, 45);

            let subtitleY = 75;
            if (branch) {
                doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor).text(branch.name, 50, subtitleY);
                subtitleY += 18;
                if (branch.address) {
                    doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text(branch.address, 50, subtitleY, { width: 250, lineGap: 2 });
                    subtitleY += 16;
                }
            }

            const dateParts = [];
            if (filters.startDate) dateParts.push(`From: ${filters.startDate}`);
            if (filters.endDate) dateParts.push(`To: ${filters.endDate}`);
            if (dateParts.length > 0) {
                doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text(dateParts.join('  |  '), 50, subtitleY, { width: 250 });
                subtitleY += 16;
            }
            if (filters.status) {
                doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text(`Status: ${filters.status}`, 50, subtitleY, { width: 250 });
            }

            const rightColY = 45;
            doc.font('Helvetica').fontSize(10).fillColor(secondaryColor);
            doc.text(`Generated: ${new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 300, rightColY, { align: 'right', width: 245 });
            doc.text(`Total Orders: ${orders.length}`, 300, rightColY + 14, { align: 'right', width: 245 });

            doc.moveTo(50, 130).lineTo(545, 130).lineWidth(1).strokeColor(borderColor).stroke();

            const summaryY = 155;
            const boxW = 110;
            const boxGap = 15;
            const boxH = 65;
            const startX = 50;

            const summaryData = [
                { label: 'Completed', value: completed.toString(), color: successColor, bg: '#dcfce7' },
                { label: 'Pending', value: pending.toString(), color: warningColor, bg: '#fef3c7' },
                { label: 'Collected', value: `Rs. ${collected.toLocaleString('en-IN')}`, color: accentColor, bg: '#e0e7ff' },
                { label: 'Pending Coll.', value: `Rs. ${pendingCollection.toLocaleString('en-IN')}`, color: dangerColor, bg: '#fee2e2' }
            ];

            summaryData.forEach((item, i) => {
                const x = startX + i * (boxW + boxGap);
                doc.roundedRect(x, summaryY, boxW, boxH, 8).fill(item.bg);
                doc.font('Helvetica-Bold').fillColor(item.color).fontSize(13).text(item.value, x, summaryY + 10, { width: boxW, align: 'center' });
                doc.font('Helvetica').fillColor(secondaryColor).fontSize(8).text(item.label, x, summaryY + 35, { width: boxW, align: 'center' });
            });

            let tableTop = summaryY + boxH + 25;

            const tableHeader = ['#', 'Customer', 'Phone', 'Items', 'Total (Rs.)', 'Status', 'Payment', 'Date'];
            const colWidths = [35, 75, 80, 40, 65, 60, 60, 60];
            const colStarts = [];
            let curX = 50;
            colWidths.forEach((w, i) => {
                colStarts.push(curX);
                curX += w;
            });

            const drawTableHeader = (yPos) => {
                doc.rect(50, yPos, 495, 24).fill(lightBg);
                doc.moveTo(50, yPos).lineTo(545, yPos).lineWidth(1).strokeColor(borderColor).stroke();
                doc.moveTo(50, yPos + 24).lineTo(545, yPos + 24).lineWidth(1).strokeColor(borderColor).stroke();

                doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(8);
                tableHeader.forEach((h, i) => {
                    const align = i === 0 || i === 3 || i === 4 ? 'center' : 'left';
                    doc.text(h, colStarts[i] + 4, yPos + 7, { width: colWidths[i] - 8, align });
                });
            };

            drawTableHeader(tableTop);

            let currentY = tableTop + 32;
            let rowCount = 0;

            orders.forEach((order, index) => {
                if (currentY > 720) {
                    doc.addPage();
                    currentY = 50;
                    drawTableHeader(currentY);
                    currentY += 32;
                }

                const customerName = order.customer?.name || order.customerName || 'Guest';
                const phone = order.customerPhone || '-';
                const itemCount = order.items?.length || 0;
                const total = parseFloat(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                const status = order.status || '-';
                const paymentStr = `${order.paymentMethod || '-'}/${order.paymentStatus || '-'}`.substring(0, 14);

                const dateStr = order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                    : '-';

                if (index % 2 === 0) {
                    doc.rect(50, currentY - 4, 495, 20).fill('#fafafa');
                }

                doc.font('Helvetica').fontSize(8).fillColor(primaryColor);
                doc.text(`#${order.id}`, colStarts[0] + 2, currentY, { width: colWidths[0] - 4, align: 'center' });

                doc.font('Helvetica-Bold').fontSize(7.5);
                doc.text(customerName.substring(0, 18), colStarts[1] + 4, currentY, { width: colWidths[1] - 8 });

                doc.font('Helvetica').fontSize(7.5).fillColor(secondaryColor);
                doc.text(phone, colStarts[2] + 4, currentY, { width: colWidths[2] - 8 });

                doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor);
                doc.text(itemCount.toString(), colStarts[3] + 2, currentY, { width: colWidths[3] - 4, align: 'center' });

                doc.text(total, colStarts[4] + 2, currentY, { width: colWidths[4] - 4, align: 'center' });

                let statusColor = primaryColor;
                if (status === 'delivered') statusColor = successColor;
                else if (status === 'pending' || status === 'shipped') statusColor = warningColor;
                else if (status === 'cancelled') statusColor = dangerColor;

                doc.font('Helvetica-Bold').fontSize(7.5).fillColor(statusColor);
                doc.text(status.charAt(0).toUpperCase() + status.slice(1), colStarts[5] + 2, currentY, { width: colWidths[5] - 4, align: 'center' });

                doc.font('Helvetica').fontSize(7).fillColor(secondaryColor);
                doc.text(paymentStr, colStarts[6] + 2, currentY, { width: colWidths[6] - 4, align: 'center' });

                doc.font('Helvetica').fontSize(7.5).fillColor(secondaryColor);
                doc.text(dateStr, colStarts[7] + 2, currentY, { width: colWidths[7] - 4, align: 'center' });

                currentY += 20;
                rowCount++;
            });

            if (orders.length > 0) {
                doc.moveTo(50, currentY - 5).lineTo(545, currentY - 5).lineWidth(1).strokeColor(borderColor).stroke();
            }

            const footerY = doc.page.height - 60;
            doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).lineWidth(1).strokeColor(borderColor).stroke();
            doc.font('Helvetica').fillColor(secondaryColor).fontSize(8).text('Friska - Automated Orders Report', 50, footerY, { align: 'center' });
            doc.font('Helvetica').fillColor(secondaryColor).fontSize(7).text(`Generated on ${new Date().toLocaleString('en-IN')} | ${orders.length} orders`, 50, footerY + 12, { align: 'center' });

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', (err) => reject(err));
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = { generateOrdersReport };
