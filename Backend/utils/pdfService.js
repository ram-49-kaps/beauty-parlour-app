
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
        doc.rect(50, 180, 510, 220).stroke('#aaaaaa');

        const leftX = 70;
        const rightX = 300;
        const startY = 200;
        const lineHeight = 30;

        doc.fontSize(12).fillColor('#333333');

        // Ref No
        doc.font('Helvetica-Bold').text('Reference No:', leftX, startY);
        doc.font('Helvetica').text(`${booking.id}`, rightX, startY);

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

        // Amount
        doc.font('Helvetica-Bold').text('Total Amount:', leftX, startY + lineHeight * 5);
        doc.font('Helvetica-Bold').text(`Rs. ${booking.total_amount || 0}`, rightX, startY + lineHeight * 5, { color: '#059669' });

        // Status
        doc.fillColor('#333333');
        doc.font('Helvetica-Bold').text('Status:', leftX, startY + lineHeight * 6);

        const statusColor = (booking.status.toLowerCase() === 'rejected' || booking.status.toLowerCase() === 'cancelled') ? '#dc2626' : '#059669';
        doc.fillColor(statusColor);
        doc.font('Helvetica-Bold').text(booking.status.toUpperCase(), rightX, startY + lineHeight * 6);

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
