import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';
import { generateBookingPDF } from './pdfService.js';

import path from 'path';

dotenv.config();

// Use CID for reliable image loading in emails
const LOGO_URL = "cid:logo";
// Use relative path for Render compatibility (Backend is root)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, '../../frontend/public/Gallery/logo.jpg');

const transporter = createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  logger: true,
  debug: true,
  // Add timeouts to fail faster/clearer
  connectionTimeout: 10000
});

(async () => {
  try {
    await transporter.verify();
    console.log("📧 Email transporter VERIFIED & ready");
  } catch (err) {
    console.error("❌ Email transporter FAILED:", err);
  }
})();

// --- COMMON STYLES FOR CONSISTENCY ---
const styles = {
  logo: `width: 80px; max-width: 80px; height: auto; display: block; margin: 0 auto; border-radius: 50%; border: 1px solid #e5e7eb; padding: 2px;`,
  container: `font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f5;`,
  header: `background-color: #1c1917; padding: 30px 0; text-align: center;`,
  brand: `color: #ffffff; font-size: 24px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; text-decoration: none;`,
  body: `background-color: #ffffff; padding: 40px; border-radius: 8px; margin: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);`,
  h2: `color: #1c1917; margin-top: 0; font-weight: 700; font-size: 22px; margin-bottom: 20px;`,
  text: `color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;`,
  detailBox: `background-color: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin: 25px 0;`,
  detailRow: `margin-bottom: 12px; font-size: 15px; color: #374151; border-bottom: 1px dashed #e5e7eb; padding-bottom: 8px;`,
  footer: `text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;`
};

// 1. CONFIRMATION EMAIL
const sendBookingConfirmation = async (booking, serviceName) => {
  const targetEmail = booking.customer_email || process.env.EMAIL_USER;
  const mailOptions = {
    from: `"Flawless Salon" <${process.env.EMAIL_USER}>`,
    to: targetEmail,
    bcc: process.env.EMAIL_USER,
    subject: 'Appointment Confirmed - Flawless Salon',
    html: `
      <div style="${styles.container}">
        <div style="${styles.header}">
        <img src="${LOGO_URL}" alt="Flawless Salon" style="${styles.logo}" />      
        </div>
        
        <div style="${styles.body}">
          <h2 style="${styles.h2} color: #059669;">Appointment Confirmed! 🎉</h2>
          <p style="${styles.text}">Dear <strong>${booking.customer_name}</strong>,</p>
          <p style="${styles.text}">We are delighted to confirm your appointment. A receipt of your booking is attached to this email.</p>
          
          <div style="${styles.detailBox} border-left: 4px solid #059669;">
          <div style="${styles.detailBox} border-left: 4px solid #059669;">
            <div style="${styles.detailRow}"><strong>Reference No:</strong> ${booking.id}</div>
            <div style="${styles.detailRow}"><strong>Service:</strong> ${serviceName}</div>
            <div style="${styles.detailRow}"><strong>Date:</strong> ${new Date(booking.booking_date).toDateString()}</div>
            <div style="${styles.detailRow}"><strong>Time:</strong> ${booking.booking_time}</div>
            <div style="font-size: 16px; color: #059669; padding-top: 5px; font-weight: bold;"><strong>Total Amount:</strong> ₹${booking.total_amount}</div>
          </div>
          
          <p style="${styles.text}">Please arrive 5 minutes early. We can't wait to see you!</p>
          <p style="${styles.text}">Warm regards,<br><strong>Team Flawless</strong></p>
        </div>
        
        <div style="${styles.footer}">
          &copy; ${new Date().getFullYear()} Flawless Salon. All rights reserved.
        </div>
      </div>
    `,
    attachments: [
      { filename: 'logo.jpg', path: LOGO_PATH, cid: 'logo' },
      { filename: `Booking_Receipt_${booking.id}.pdf`, content: await generateBookingPDF(booking, serviceName) }
    ]
  };
  const info = await transporter.sendMail(mailOptions);
  console.log(`📨 Booking confirmation email queued. MessageId=${info.messageId} To=${targetEmail}`);
};

// 2. REJECTION EMAIL
const sendBookingRejection = async (booking, serviceName, reason = '') => {
  const mailOptions = {
    from: `"Flawless Salon" <${process.env.EMAIL_USER}>`,
    to: booking.customer_email,
    subject: 'IMPORTANT: Update Regarding Your Appointment',
    html: `
      <div style="${styles.container}">
        <div style="${styles.header}">
        <img src="${LOGO_URL}" alt="Flawless Salon" style="${styles.logo}" />      
        </div>
        
        <div style="${styles.body}">
          <h2 style="${styles.h2} color: #dc2626;">Booking Request Declined</h2>
          <p style="${styles.text}">Dear <strong>${booking.customer_name}</strong>,</p>
          <p style="${styles.text}">We sincerely apologize, but we are unable to fulfill your appointment request for <strong>${serviceName}</strong> at this time.</p>
          
          <div style="${styles.detailBox} border-left: 4px solid #dc2626; background-color: #fef2f2;">
             <p style="margin: 0; color: #991b1b; font-weight: bold;">Reason:</p>
             <p style="margin: 5px 0 0 0; color: #7f1d1d;">${reason || 'The selected time slot is no longer available due to high demand.'}</p>
          </div>
          
          <p style="${styles.text}">We would love to see you at another time. Please visit our website to check other available slots.</p>
          <p style="${styles.text}">Regards,<br><strong>Team Flawless</strong></p>
        </div>

        <div style="${styles.footer}">
          &copy; ${new Date().getFullYear()} Flawless Salon. All rights reserved.
        </div>
      </div>
    `,
    attachments: [
      { filename: 'logo.jpg', path: LOGO_PATH, cid: 'logo' },
      { filename: `Booking_Status_${booking.id}.pdf`, content: await generateBookingPDF(booking, serviceName) }
    ]
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`📨 Rejection Email Sent to ${booking.customer_email}`);
  } catch (err) {
    console.error("❌ Failed to send rejection email:", err);
  }
};

// 3. NOTIFICATION (PENDING) EMAIL
const sendBookingNotification = async (booking, serviceName) => {
  const mailOptions = {
    from: `"Flawless by Drashti" <${process.env.EMAIL_USER}>`,
    to: booking.customer_email,
    bcc: process.env.EMAIL_USER, // Admin receives a copy of new requests
    subject: 'Appointment Request Received',
    html: `
      <div style="${styles.container}">
        <div style="${styles.header}">
        <img src="${LOGO_URL}" alt="Flawless Salon" style="${styles.logo}" />      
        </div>
        
        <div style="${styles.body}">
          <h2 style="${styles.h2} color: #d97706;">Request Received ⏳</h2>
          <p style="${styles.text}">Dear <strong>${booking.customer_name}</strong>,</p>
          <p style="${styles.text}">We have received your booking request! It is currently <strong>Pending Approval</strong>.</p>
          
          <div style="${styles.detailBox} border-left: 4px solid #d97706;">
          <div style="${styles.detailBox} border-left: 4px solid #d97706;">
            <div style="${styles.detailRow}"><strong>Reference No:</strong> ${booking.id}</div>
            <div style="${styles.detailRow}"><strong>Service:</strong> ${serviceName}</div>
            <div style="${styles.detailRow}"><strong>Requested Date:</strong> ${new Date(booking.booking_date).toDateString()}</div>
            <div style="${styles.detailRow}"><strong>Requested Time:</strong> ${booking.booking_time}</div>
            <div style="${styles.detailRow}"><strong>Est. Amount:</strong> ₹${booking.total_amount}</div>
          </div>
          
          <p style="${styles.text}">You will receive a final confirmation email shortly containing your booking receipt.</p>
          <p style="${styles.text}">Best,<br><strong>Team Flawless</strong></p>
        </div>

        <div style="${styles.footer}">
          &copy; ${new Date().getFullYear()} Flawless Salon. All rights reserved.
        </div>
      </div>
    `,
    attachments: [{ filename: 'logo.jpg', path: LOGO_PATH, cid: 'logo' }]
  };
  await transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (email, resetLink) => {
  const mailOptions = {
    from: `"Flawless Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Password - Flawless Salon',
    html: `
      <div style="${styles.container}">
        <div style="${styles.header}">
        <img src="${LOGO_URL}" alt="Flawless Salon" style="${styles.logo}" />      
        </div>
        
        <div style="${styles.body}">
          <h2 style="${styles.h2}">Password Reset Request</h2>
          <p style="${styles.text}">We received a request to reset your password. If this was you, click the button below to set a new password.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #1c1917; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          
          <p style="${styles.text} font-size: 12px; color: #9ca3af;">This link expires in 1 hour. If you didn't ask for this, you can ignore this email.</p>
        </div>

        <div style="${styles.footer}">
          &copy; ${new Date().getFullYear()} Flawless Salon. Security Team.
        </div>
      </div>
    `,
    attachments: [{ filename: 'logo.jpg', path: LOGO_PATH, cid: 'logo' }]
  };
  await transporter.sendMail(mailOptions);
};

export default {
  sendBookingConfirmation,
  sendBookingRejection,
  sendBookingNotification,
  sendPasswordResetEmail
};
