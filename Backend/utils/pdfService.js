
import PDFDocument from 'pdfkit';

export const generateBookingPDF = (booking, serviceName) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        // --- PDF CONTENT ---

        // 1. Header
        doc
            .fillColor('#444444')
            .fontSize(20)
            .text('FLAWLESS By Drashti', 110, 57)
            .fontSize(10)
            .text('Gangotri Society Bhatar, Surat', 200, 65, { align: 'right' })
            .text('+91 98765 43210', 200, 80, { align: 'right' })
            .moveDown();

        // 2. Title
        doc
            .fillColor('#000000')
            .fontSize(20)
            .text('Booking Receipt', 50, 140, { align: 'center' })
            .moveDown();

        // 3. Booking Details Box
        const hasPaymentInfo = booking.advance_amount > 0 || booking.remaining_amount > 0;
        const boxHeight = hasPaymentInfo ? 340 : 220;
        doc.rect(50, 180, 510, boxHeight).stroke('#aaaaaa');

        const leftX = 70;
        const rightX = 300;
        const startY = 200;
        const lineHeight = 30;

        doc.fontSize(12).fillColor('#333333');

        // Ref No
        doc.font('Helvetica-Bold').text('Reference No:', leftX, startY);
        doc.font('Helvetica').text(`FLAW-${booking.id}`, rightX, startY);

        // Customer Name
        doc.font('Helvetica-Bold').text('Customer Name:', leftX, startY + lineHeight);
        doc.font('Helvetica').text(booking.customer_name, rightX, startY + lineHeight);

        // Service
        doc.font('Helvetica-Bold').text('Service:', leftX, startY + lineHeight * 2);
        doc.font('Helvetica').text(serviceName, rightX, startY + lineHeight * 2);

        // Date
        doc.font('Helvetica-Bold').text('Date:', leftX, startY + lineHeight * 3);
        doc.font('Helvetica').text(new Date(booking.booking_date).toDateString(), rightX, startY + lineHeight * 3);

        // Time
        doc.font('Helvetica-Bold').text('Time:', leftX, startY + lineHeight * 4);
        doc.font('Helvetica').text(booking.booking_time, rightX, startY + lineHeight * 4);

        // Total Amount
        doc.font('Helvetica-Bold').text('Total Amount:', leftX, startY + lineHeight * 5);
        doc.font('Helvetica').text(`Rs. ${booking.total_amount || 0}`, rightX, startY + lineHeight * 5);

        let currentLine = 6;

        // Discount (if coupon applied)
        if (booking.discount_amount && parseFloat(booking.discount_amount) > 0) {
            doc.fillColor('#059669');
            doc.font('Helvetica-Bold').text('Discount:', leftX, startY + lineHeight * currentLine);
            doc.font('Helvetica').text(`- Rs. ${booking.discount_amount} (${booking.coupon_code || 'Coupon'})`, rightX, startY + lineHeight * currentLine);
            doc.fillColor('#333333');
            currentLine++;

            // Final Amount
            const finalAmount = parseFloat(booking.total_amount) - parseFloat(booking.discount_amount);
            doc.font('Helvetica-Bold').text('Final Amount:', leftX, startY + lineHeight * currentLine);
            doc.font('Helvetica-Bold').text(`Rs. ${finalAmount}`, rightX, startY + lineHeight * currentLine);
            currentLine++;
        }

        // Payment Breakdown (if half-payment)
        if (hasPaymentInfo) {
            // Divider line
            doc.moveTo(leftX, startY + lineHeight * currentLine - 5)
               .lineTo(500, startY + lineHeight * currentLine - 5)
               .stroke('#cccccc');

            // Advance Paid
            doc.fillColor('#059669');
            doc.font('Helvetica-Bold').text('Advance Paid (50%):', leftX, startY + lineHeight * currentLine);
            doc.font('Helvetica-Bold').text(`Rs. ${booking.advance_amount} ✓`, rightX, startY + lineHeight * currentLine);
            currentLine++;

            // Remaining Amount
            const remainingColor = parseFloat(booking.remaining_amount) > 0 ? '#d97706' : '#059669';
            doc.fillColor(remainingColor);
            doc.font('Helvetica-Bold').text('Balance Due (After Service):', leftX, startY + lineHeight * currentLine);
            doc.font('Helvetica-Bold').text(`Rs. ${booking.remaining_amount}`, rightX, startY + lineHeight * currentLine);
            currentLine++;

            // Payment Status
            doc.fillColor('#333333');
            doc.font('Helvetica-Bold').text('Payment Status:', leftX, startY + lineHeight * currentLine);
            const paymentStatusColor = booking.payment_status === 'fully_paid' ? '#059669' : '#d97706';
            const paymentStatusText = booking.payment_status === 'fully_paid' ? 'FULLY PAID' : 'ADVANCE PAID';
            doc.fillColor(paymentStatusColor);
            doc.font('Helvetica-Bold').text(paymentStatusText, rightX, startY + lineHeight * currentLine);
            currentLine++;
        }

        // Booking Status
        doc.fillColor('#333333');
        doc.font('Helvetica-Bold').text('Booking Status:', leftX, startY + lineHeight * currentLine);

        const statusColor = (booking.status?.toLowerCase() === 'rejected' || booking.status?.toLowerCase() === 'cancelled') ? '#dc2626' : '#059669';
        doc.fillColor(statusColor);
        doc.font('Helvetica-Bold').text((booking.status || 'pending').toUpperCase(), rightX, startY + lineHeight * currentLine);

        // 4. Footer
        doc
            .fontSize(10)
            .fillColor('#777777')
            .text(
                'Thank you for choosing Flawless Salon. We look forward to seeing you!',
                50,
                700,
                { align: 'center', width: 500 }
            );

        doc.end();
    });
};
