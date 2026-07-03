const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const fontDir = path.join(__dirname, 'fonts');
const fontRegular = path.join(fontDir, 'NotoSans-Regular.ttf');
const fontBold = path.join(fontDir, 'NotoSans-Bold.ttf');
const fontArabicRegular = path.join(fontDir, 'NotoSansArabic-Regular.ttf');
const fontArabicBold = path.join(fontDir, 'NotoSansArabic-Bold.ttf');

const hasArabic = (text) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

const stripEmoji = (text) => text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{2300}-\u{23FF}\u{2B50}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FB}\u{25FC}\u{25FD}\u{25FE}\u{2B1B}\u{2B1C}\u{25FC}]/gu, '').trim();

const pickFont = (doc, weight, text) => {
    const clean = stripEmoji(text || '');
    if (hasArabic(clean)) {
        doc.font(weight === 'bold' ? 'Arabic-Bold' : 'Arabic-Regular');
    } else {
        doc.font(weight === 'bold' ? 'Custom-Bold' : 'Custom-Regular');
    }
    return clean;
};

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

            doc.registerFont('Custom-Regular', fontRegular);
            doc.registerFont('Custom-Bold', fontBold);
            doc.registerFont('Arabic-Regular', fontArabicRegular);
            doc.registerFont('Arabic-Bold', fontArabicBold);

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

            doc.rect(0, 0, doc.page.width, 12).fill(accentColor);

            const logoPath = path.join(__dirname, '../wstore_admin/src/assets/logo.png');
            let logoExists = false;
            try {
                if (fs.existsSync(logoPath)) logoExists = true;
            } catch (e) {}

            let headerY = 75;
            if (logoExists) {
                doc.image(logoPath, 50, 30, { height: 50 });
                headerY = 95;
            } else {
                pickFont(doc, 'bold', 'ORDERS REPORT');
                doc.fillColor(primaryColor).fontSize(22).text('ORDERS REPORT', 50, 45);
            }

            let subtitleY = headerY;
            if (branch) {
                pickFont(doc, 'bold', branch.name);
                doc.fontSize(12).fillColor(primaryColor).text(branch.name, 50, subtitleY);
                subtitleY += 18;
                if (branch.address) {
                    const addr = pickFont(doc, 'regular', branch.address);
                    doc.fontSize(10).fillColor(secondaryColor).text(addr, 50, subtitleY, { width: 250, lineGap: 2 });
                    subtitleY += 16;
                }
            }

            const dateParts = [];
            if (filters.startDate) dateParts.push(`From: ${filters.startDate}`);
            if (filters.endDate) dateParts.push(`To: ${filters.endDate}`);
            if (dateParts.length > 0) {
                pickFont(doc, 'regular', dateParts.join('  |  '));
                doc.fontSize(10).fillColor(secondaryColor).text(dateParts.join('  |  '), 50, subtitleY, { width: 250 });
                subtitleY += 16;
            }
            if (filters.status) {
                pickFont(doc, 'regular', filters.status);
                doc.fontSize(10).fillColor(secondaryColor).text(`Status: ${filters.status}`, 50, subtitleY, { width: 250 });
            }

            const rightColY = 45;
            pickFont(doc, 'regular', '');
            doc.fontSize(10).fillColor(secondaryColor);
            doc.text(`Generated: ${new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 300, rightColY, { align: 'right', width: 245 });
            doc.text(`Total Orders: ${orders.length}`, 300, rightColY + 14, { align: 'right', width: 245 });

            doc.moveTo(50, 140).lineTo(545, 140).lineWidth(1).strokeColor(borderColor).stroke();

            const summaryY = 165;
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
                pickFont(doc, 'bold', item.value);
                doc.fillColor(item.color).fontSize(13).text(item.value, x, summaryY + 10, { width: boxW, align: 'center' });
                pickFont(doc, 'regular', item.label);
                doc.fillColor(secondaryColor).fontSize(8).text(item.label, x, summaryY + 35, { width: boxW, align: 'center' });
            });

            let tableTop = summaryY + boxH + 25;

            const tableHeader = ['#', 'Customer', 'Phone', 'Items', 'Total (Rs.)', 'Status', 'Payment', 'Date'];
            const colWidths = [35, 75, 80, 40, 65, 60, 60, 60];
            const colStarts = [];
            let curX = 50;
            colWidths.forEach((w) => {
                colStarts.push(curX);
                curX += w;
            });

            const drawTableHeader = (yPos) => {
                doc.rect(50, yPos, 495, 24).fill(lightBg);
                doc.moveTo(50, yPos).lineTo(545, yPos).lineWidth(1).strokeColor(borderColor).stroke();
                doc.moveTo(50, yPos + 24).lineTo(545, yPos + 24).lineWidth(1).strokeColor(borderColor).stroke();

                pickFont(doc, 'bold', '');
                doc.fontSize(8).fillColor(primaryColor);
                tableHeader.forEach((h, i) => {
                    const align = i === 0 || i === 3 || i === 4 ? 'center' : 'left';
                    doc.text(h, colStarts[i] + 4, yPos + 7, { width: colWidths[i] - 8, align });
                });
            };

            drawTableHeader(tableTop);

            let currentY = tableTop + 32;

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

                pickFont(doc, 'regular', '#');
                doc.fontSize(8).fillColor(primaryColor);
                doc.text(`#${order.id}`, colStarts[0] + 2, currentY, { width: colWidths[0] - 4, align: 'center' });

                const safeName = pickFont(doc, 'bold', customerName);
                doc.fontSize(7.5);
                doc.text(safeName.substring(0, 18), colStarts[1] + 4, currentY, { width: colWidths[1] - 8 });

                pickFont(doc, 'regular', phone);
                doc.fontSize(7.5).fillColor(secondaryColor);
                doc.text(phone, colStarts[2] + 4, currentY, { width: colWidths[2] - 8 });

                pickFont(doc, 'bold', '');
                doc.fontSize(8).fillColor(primaryColor);
                doc.text(itemCount.toString(), colStarts[3] + 2, currentY, { width: colWidths[3] - 4, align: 'center' });

                doc.text(total, colStarts[4] + 2, currentY, { width: colWidths[4] - 4, align: 'center' });

                let statusColor = primaryColor;
                if (status === 'delivered') statusColor = successColor;
                else if (status === 'pending' || status === 'shipped') statusColor = warningColor;
                else if (status === 'cancelled') statusColor = dangerColor;

                pickFont(doc, 'bold', status);
                doc.fontSize(7.5).fillColor(statusColor);
                const capStatus = status.charAt(0).toUpperCase() + status.slice(1);
                doc.text(capStatus, colStarts[5] + 2, currentY, { width: colWidths[5] - 4, align: 'center' });

                pickFont(doc, 'regular', paymentStr);
                doc.fontSize(7).fillColor(secondaryColor);
                doc.text(paymentStr, colStarts[6] + 2, currentY, { width: colWidths[6] - 4, align: 'center' });

                pickFont(doc, 'regular', dateStr);
                doc.fontSize(7.5).fillColor(secondaryColor);
                doc.text(dateStr, colStarts[7] + 2, currentY, { width: colWidths[7] - 4, align: 'center' });

                currentY += 20;
            });

            if (orders.length > 0) {
                doc.moveTo(50, currentY - 5).lineTo(545, currentY - 5).lineWidth(1).strokeColor(borderColor).stroke();
            }

            const footerY = doc.page.height - 60;
            doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).lineWidth(1).strokeColor(borderColor).stroke();
            pickFont(doc, 'regular', '');
            doc.fillColor(secondaryColor).fontSize(8).text('Friska - Automated Orders Report', 50, footerY, { align: 'center' });
            doc.fontSize(7).text(`Generated on ${new Date().toLocaleString('en-IN')} | ${orders.length} orders`, 50, footerY + 12, { align: 'center' });

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', (err) => reject(err));
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = { generateOrdersReport };
