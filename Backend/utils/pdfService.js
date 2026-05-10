
import PDFDocument from 'pdfkit';

// Helper: format time like "9:30 AM"
const formatTime = (t) => {
    if (!t) return '';
    const parts = String(t).split(':');
    const h = parseInt(parts[0]);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${hour12}:${m} ${ampm}`;
};

// Helper: format date like "21 May 2026"
const formatDate = (d) => {
    try {
        const date = new Date(d);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return String(d);
    }
};

// Helper: format booking ID as #FBD-0001
const formatBookingId = (id) => `#FBD-${String(id).padStart(4, '0')}`;

export const generateBookingPDF = (booking, serviceName) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        const pageWidth = 595;
        const contentLeft = 60;
        const contentRight = pageWidth - 60;
        const contentWidth = contentRight - contentLeft;

        // ─── COLORS ───
        const darkBg = '#1c1917';
        const textPrimary = '#1c1917';
        const textSecondary = '#78716c';
        const textMuted = '#a8a29e';
        const borderColor = '#e7e5e4';
        const greenColor = '#22c55e';
        const amberColor = '#f59e0b';
        const redColor = '#ef4444';
        const grayColor = '#6b7280';

        // ─── 1. DARK HEADER BLOCK ───
        doc.rect(0, 0, pageWidth, 130).fill(darkBg);

        // Brand name
        doc.fillColor('#ffffff')
           .font('Helvetica')
           .fontSize(26)
           .text('F L A W L E S S', 0, 40, { align: 'center', width: pageWidth });

        doc.fillColor(textMuted)
           .fontSize(9)
           .text('B Y   D R A S H T I', 0, 70, { align: 'center', width: pageWidth });

        // Status badges
        const statusColors = {
            pending: amberColor,
            confirmed: greenColor,
            completed: '#3b82f6',
            rejected: redColor,
            cancelled: grayColor
        };

        const paymentLabels = {
            advance_paid: '50% ADVANCE PAID',
            fully_paid: 'FULLY PAID',
            unpaid: 'UNPAID'
        };

        const paymentColors = {
            advance_paid: amberColor,
            fully_paid: greenColor,
            unpaid: redColor
        };

        const statusText = (booking.status || 'pending').toUpperCase();
        const statusCol = statusColors[booking.status] || grayColor;
        const paymentText = paymentLabels[booking.payment_status] || 'PENDING';
        const paymentCol = paymentColors[booking.payment_status] || amberColor;

        // Draw status badge
        const badgeY = 92;
        const badge1Width = doc.widthOfString(statusText, { fontSize: 8 }) + 18;
        const badge2Width = doc.widthOfString(paymentText, { fontSize: 8 }) + 18;
        const totalBadgeWidth = badge1Width + badge2Width + 10;
        const badgeStartX = (pageWidth - totalBadgeWidth) / 2;

        // Status badge
        doc.roundedRect(badgeStartX, badgeY, badge1Width, 20, 10).fill(statusCol);
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
           .text(statusText, badgeStartX, badgeY + 6, { width: badge1Width, align: 'center' });

        // Payment badge
        const badge2X = badgeStartX + badge1Width + 10;
        doc.roundedRect(badge2X, badgeY, badge2Width, 20, 10).lineWidth(1).fillAndStroke(`${paymentCol}22`, paymentCol);
        doc.fillColor(paymentCol).fontSize(8).font('Helvetica-Bold')
           .text(paymentText, badge2X, badgeY + 6, { width: badge2Width, align: 'center' });

        // ─── 2. BOOKING ID & PAYMENT ID ───
        let currentY = 150;

        doc.fillColor(textMuted).fontSize(9).font('Helvetica')
           .text(`Booking ID: `, 0, currentY, { align: 'center', width: pageWidth, continued: true });
        doc.fillColor(textPrimary).font('Helvetica-Bold')
           .text(formatBookingId(booking.id));

        if (booking.razorpay_payment_id) {
            currentY += 16;
            doc.fillColor(textMuted).fontSize(8).font('Helvetica')
               .text(`Payment ID: `, 0, currentY, { align: 'center', width: pageWidth, continued: true });
            doc.fillColor(textPrimary).font('Helvetica-Bold')
               .text(booking.razorpay_payment_id);
        }

        // Dashed divider
        currentY += 28;
        for (let x = contentLeft; x < contentRight; x += 6) {
            doc.moveTo(x, currentY).lineTo(x + 3, currentY).stroke(borderColor);
        }

        // ─── 3. APPOINTMENT DETAILS SECTION ───
        currentY += 16;
        doc.fillColor(textMuted).fontSize(9).font('Helvetica-Bold')
           .text('A P P O I N T M E N T   D E T A I L S', contentLeft, currentY);

        currentY += 20;
        const rowHeight = 28;
        const labelX = contentLeft;
        const valueX = contentRight;

        const drawRow = (label, value, y, valueColor = textPrimary) => {
            doc.fillColor(textSecondary).fontSize(11).font('Helvetica')
               .text(label, labelX, y);
            doc.fillColor(valueColor).fontSize(11).font('Helvetica-Bold')
               .text(value, labelX, y, { width: contentWidth, align: 'right' });
        };

        drawRow('Service', serviceName, currentY);
        currentY += rowHeight;
        drawRow('Date', formatDate(booking.booking_date), currentY);
        currentY += rowHeight;
        drawRow('Time', formatTime(booking.booking_time), currentY);
        currentY += rowHeight;

        // Duration (if available)
        if (booking.duration) {
            drawRow('Duration', `${booking.duration} Minutes`, currentY);
            currentY += rowHeight;
        }

        // ─── 4. CLIENT INFORMATION SECTION ───
        currentY += 8;
        doc.fillColor(textMuted).fontSize(9).font('Helvetica-Bold')
           .text('C L I E N T   I N F O R M A T I O N', contentLeft, currentY);

        currentY += 20;
        drawRow('Name', booking.customer_name || '-', currentY);
        currentY += rowHeight;
        drawRow('Email', booking.customer_email || '-', currentY);
        currentY += rowHeight;
        if (booking.customer_phone) {
            drawRow('Phone', booking.customer_phone, currentY);
            currentY += rowHeight;
        }

        // ─── 5. PAYMENT BREAKDOWN SECTION ───
        currentY += 8;
        doc.fillColor(textMuted).fontSize(9).font('Helvetica-Bold')
           .text('P A Y M E N T   B R E A K D O W N', contentLeft, currentY);

        currentY += 16;

        // Payment box background
        const boxStartY = currentY;
        const hasDiscount = booking.discount_amount && parseFloat(booking.discount_amount) > 0;
        const hasPaymentInfo = booking.advance_amount > 0 || booking.remaining_amount > 0;
        const boxRows = 1 + (hasDiscount ? 1 : 0) + 1 + (hasPaymentInfo ? 2 : 0);
        const boxHeight = boxRows * rowHeight + 30;

        doc.roundedRect(contentLeft, boxStartY, contentWidth, boxHeight, 8)
           .fill('#fafaf9');

        const boxLeft = contentLeft + 16;
        const boxRight = contentRight - 16;
        const boxWidth = boxRight - boxLeft;
        currentY += 12;

        // Service Price
        doc.fillColor(textSecondary).fontSize(11).font('Helvetica')
           .text('Service Price', boxLeft, currentY);
        doc.fillColor(textPrimary).fontSize(11).font('Helvetica-Bold')
           .text(`₹${parseFloat(booking.total_amount || 0).toFixed(2)}`, boxLeft, currentY, { width: boxWidth, align: 'right' });
        currentY += rowHeight;

        // Discount
        if (hasDiscount) {
            doc.fillColor(amberColor).fontSize(11).font('Helvetica-Bold')
               .text(`Discount ${booking.coupon_code ? '(' + booking.coupon_code + ')' : ''}`, boxLeft, currentY);
            doc.fillColor(amberColor).fontSize(11).font('Helvetica-Bold')
               .text(`-₹${parseFloat(booking.discount_amount).toFixed(2)}`, boxLeft, currentY, { width: boxWidth, align: 'right' });
            currentY += rowHeight;
        }

        // Thick divider before total
        doc.moveTo(boxLeft, currentY - 4).lineTo(boxRight, currentY - 4).lineWidth(2).stroke(textPrimary);

        // Grand Total
        const finalTotal = parseFloat(booking.total_amount || 0) - parseFloat(booking.discount_amount || 0);
        doc.fillColor(textPrimary).fontSize(14).font('Helvetica-Bold')
           .text('Total', boxLeft, currentY + 2);
        doc.fillColor(textPrimary).fontSize(14).font('Helvetica-Bold')
           .text(`₹${finalTotal.toFixed(2)}`, boxLeft, currentY + 2, { width: boxWidth, align: 'right' });
        currentY += rowHeight + 4;

        // Payment split
        if (hasPaymentInfo) {
            // Dashed divider
            for (let x = boxLeft; x < boxRight; x += 6) {
                doc.moveTo(x, currentY).lineTo(x + 3, currentY).lineWidth(0.5).stroke(borderColor);
            }
            currentY += 10;

            // Advance Paid
            doc.fillColor(greenColor).fontSize(10).font('Helvetica-Bold')
               .text('✓ Advance Paid (50%)', boxLeft, currentY);
            doc.fillColor(greenColor).fontSize(10).font('Helvetica-Bold')
               .text(`₹${parseFloat(booking.advance_amount || 0).toFixed(2)}`, boxLeft, currentY, { width: boxWidth, align: 'right' });
            currentY += rowHeight - 4;

            // Due After Service
            const remainingAmount = parseFloat(booking.remaining_amount || 0);
            const dueColor = remainingAmount > 0 ? amberColor : greenColor;
            doc.fillColor(dueColor).fontSize(10).font('Helvetica-Bold')
               .text('○ Due After Service', boxLeft, currentY);
            doc.fillColor(dueColor).fontSize(10).font('Helvetica-Bold')
               .text(`₹${remainingAmount.toFixed(2)}`, boxLeft, currentY, { width: boxWidth, align: 'right' });
            currentY += rowHeight;
        }

        // ─── 6. FOOTER ───
        currentY = Math.max(currentY + 30, 680);

        // Dashed divider
        for (let x = contentLeft; x < contentRight; x += 6) {
            doc.moveTo(x, currentY).lineTo(x + 3, currentY).lineWidth(0.5).stroke(borderColor);
        }
        currentY += 16;

        doc.fillColor(textMuted).fontSize(9).font('Helvetica')
           .text('Thank you for choosing Flawless By Drashti.', 0, currentY, { align: 'center', width: pageWidth });
        currentY += 14;
        doc.text('Please arrive 10 minutes before your scheduled time.', 0, currentY, { align: 'center', width: pageWidth });

        currentY += 24;
        doc.fillColor('#d6d3d1').fontSize(8).font('Helvetica')
           .text('F L A W L E S S   B Y   D R A S H T I  •  S U R A T ,  I N D I A', 0, currentY, { align: 'center', width: pageWidth });

        doc.end();
    });
};
