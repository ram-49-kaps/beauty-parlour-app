import dotenv from 'dotenv';
import { generateBookingPDF } from './pdfService.js';

dotenv.config();

// ✅ Use FRONTEND_URL from environment variables (so it updates when you change your domain)
const FRONTEND_URL = process.env.FRONTEND_URL || "https://beauty-parlour-app.vercel.app";
const LOGO_URL = `${FRONTEND_URL}/Gallery/logo.jpg`;

// ✅ NEW: Use Brevo API directly via fetch (bypasses SMTP port blocking)
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.EMAIL_USER || 'flawlessbydrashti@gmail.com';
const FROM_NAME = 'Flawless Salon';

// Helper function to send email via Brevo API
const sendEmailViaBrevo = async (to, subject, htmlContent, attachments = []) => {
  try {
    const payload = {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent
    };

    // Add BCC to admin for all emails
    if (to !== process.env.EMAIL_USER) {
      payload.bcc = [{ email: process.env.EMAIL_USER }];
    }

    // Add attachments if provided
    if (attachments.length > 0) {
      payload.attachment = attachments.map(att => ({
        name: att.filename,
        content: att.content.toString('base64')
      }));
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Brevo API Error: ${error}`);
    }

    const result = await response.json();
    console.log(`📨 Email sent via Brevo. MessageId=${result.messageId}`);
    return result;
  } catch (error) {
    console.error('❌ Brevo email failed:', error.message);
    throw error;
  }
};

// Verify API key on startup
(async () => {
  if (!BREVO_API_KEY) {
    console.error("❌ BREVO_API_KEY not set in environment variables!");
    return;
  }
  console.log("📧 Email service ready (Brevo API)");
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
  const refNo = `FLAW-${booking.id}`;

  const htmlContent = `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <img src="${LOGO_URL}" alt="Flawless Salon" style="${styles.logo}" />
      </div>
      
      <div style="${styles.body}">
        <h2 style="${styles.h2} color: #059669;">Appointment Confirmed! 🎉</h2>
        <p style="${styles.text}">Dear <strong>${booking.customer_name}</strong>,</p>
        <p style="${styles.text}">We are delighted to confirm your appointment. A receipt of your booking is attached to this email.</p>
        
        <div style="${styles.detailBox} border-left: 4px solid #059669;">
          <div style="${styles.detailRow}"><strong>Reference No:</strong> ${refNo}</div>
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
  `;

  const pdfBuffer = await generateBookingPDF(booking, serviceName);

  await sendEmailViaBrevo(
    targetEmail,
    'Appointment Confirmed - Flawless Salon',
    htmlContent,
    [
      { filename: `Booking_Receipt_${booking.id}.pdf`, content: pdfBuffer }
    ]
  );

  console.log(`📨 Booking confirmation sent to ${targetEmail}`);
};

// 2. REJECTION EMAIL
const sendBookingRejection = async (booking, serviceName, reason = '') => {
  const htmlContent = `
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
  `;

  try {
    const pdfBuffer = await generateBookingPDF(booking, serviceName);

    await sendEmailViaBrevo(
      booking.customer_email,
      'IMPORTANT: Update Regarding Your Appointment',
      htmlContent,
      [
        { filename: `Booking_Status_${booking.id}.pdf`, content: pdfBuffer }
      ]
    );
    console.log(`📨 Rejection Email Sent to ${booking.customer_email}`);
  } catch (err) {
    console.error("❌ Failed to send rejection email:", err);
  }
};

// 3. NOTIFICATION (PENDING) EMAIL - NOW WITH PDF
const sendBookingNotification = async (booking, serviceName) => {
  const refNo = `FLAW-${booking.id}`;

  const htmlContent = `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <img src="${LOGO_URL}" alt="Flawless Salon" style="${styles.logo}" />
      </div>
      
      <div style="${styles.body}">
        <h2 style="${styles.h2} color: #d97706;">Request Received ⏳</h2>
        <p style="${styles.text}">Dear <strong>${booking.customer_name}</strong>,</p>
        <p style="${styles.text}">We have received your booking request! It is currently <strong>Pending Approval</strong>.</p>
        
        <div style="${styles.detailBox} border-left: 4px solid #d97706;">
          <div style="${styles.detailRow}"><strong>Reference No:</strong> ${refNo}</div>
          <div style="${styles.detailRow}"><strong>Service:</strong> ${serviceName}</div>
          <div style="${styles.detailRow}"><strong>Requested Date:</strong> ${new Date(booking.booking_date).toDateString()}</div>
          <div style="${styles.detailRow}"><strong>Requested Time:</strong> ${booking.booking_time}</div>
          <div style="${styles.detailRow}"><strong>Est. Amount:</strong> ₹${booking.total_amount}</div>
        </div>
        
        <p style="${styles.text}">A preliminary receipt is attached. You will receive a final confirmation email shortly.</p>
        <p style="${styles.text}">Best,<br><strong>Team Flawless</strong></p>
      </div>

      <div style="${styles.footer}">
        &copy; ${new Date().getFullYear()} Flawless Salon. All rights reserved.
      </div>
    </div>
  `;

  try {
    // Generate Pending PDF
    const pdfBuffer = await generateBookingPDF(booking, serviceName);

    await sendEmailViaBrevo(
      booking.customer_email,
      'Appointment Request Received',
      htmlContent,
      [
        { filename: `Booking_Request_${booking.id}.pdf`, content: pdfBuffer }
      ]
    );
    console.log(`📨 Pending Notification sent to ${booking.customer_email}`);
  } catch (error) {
    console.error("❌ Failed to send pending email:", error);
  }
};

const sendPasswordResetEmail = async (email, resetLink) => {
  const htmlContent = `
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
  `;

  await sendEmailViaBrevo(
    email,
    'Reset Your Password - Flawless Salon',
    htmlContent
  );
};

// 4. LOGIN SUCCESS EMAIL
const sendLoginSuccessEmail = async (email, name) => {
  const htmlContent = `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <img src="${LOGO_URL}" alt="Flawless Salon" style="${styles.logo}" />
      </div>
      
      <div style="${styles.body}">
        <h2 style="${styles.h2}">Welcome Back! ✨</h2>
        <p style="${styles.text}">Hello <strong>${name}</strong>,</p>
        <p style="${styles.text}">You have successfully logged in to your <strong>Flawless Salon</strong> account.</p>
        
        <div style="${styles.detailBox} border-left: 4px solid #1c1917;">
           <p style="margin: 0; color: #374151;">We are excited to have you back. Ready to glow?</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/booking" style="background-color: #1c1917; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px; display: inline-block;">Book Appointment</a>
        </div>

        <p style="${styles.text} font-size: 12px; color: #9ca3af;">If this wasn't you, please reset your password immediately.</p>
      </div>

      <div style="${styles.footer}">
        &copy; ${new Date().getFullYear()} Flawless Salon. Security Team.
      </div>
    </div>
  `;

  // We don't await this to keep login fast
  sendEmailViaBrevo(
    email,
    'Login Successful - Flawless Salon',
    htmlContent
  ).catch(err => console.error("Login email failed", err));
};

// 5. WELCOME EMAIL (REGISTRATION)
const sendWelcomeEmail = async (email, name) => {
  const htmlContent = `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <img src="${LOGO_URL}" alt="Flawless Salon" style="${styles.logo}" />
      </div>
      
      <div style="${styles.body}">
        <h2 style="${styles.h2}">Welcome to Flawless! 💖</h2>
        <p style="${styles.text}">Hello <strong>${name}</strong>,</p>
        <p style="${styles.text}">Thank you for joining <strong>Flawless by Drashti</strong>. Your account has been successfully created.</p>
        
        <p style="${styles.text}">Explore our premium services, manage your bookings, and get exclusive offers directly from your dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}" style="background-color: #1c1917; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px; display: inline-block;">Visit Salon Profile</a>
        </div>
      </div>

      <div style="${styles.footer}">
        &copy; ${new Date().getFullYear()} Flawless Salon. All rights reserved.
      </div>
    </div>
  `;

  await sendEmailViaBrevo(
    email,
    'Welcome to Flawless Salon! 🎉',
    htmlContent
  );
  // 6. LAUNCH NOTIFICATION EMAIL
  const sendLaunchNotificationEmail = async (email) => {
    const htmlContent = `
    <div style="${styles.container}">
      <div style="${styles.header}">
        <img src="${LOGO_URL}" alt="Flawless Salon" style="${styles.logo}" />
      </div>
      
      <div style="${styles.body}">
        <h2 style="${styles.h2} text-align: center; color: #d4af37; font-size: 28px;">WE ARE LIVE! ✨</h2>
        <p style="${styles.text} text-align: center;">The wait is finally over.</p>
        
        <p style="${styles.text}">Hello Beauty,</p>
        <p style="${styles.text}">We are thrilled to announce that <strong>Flawless By Drashti</strong> is officially open for bookings. Experience luxury beauty services like never before.</p>
        
        <div style="background-color: #fce7f3; border: 1px solid #fbcfe8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: #be185d; font-weight: bold;">Exclusive Launch Offer</p>
            <p style="margin: 5px 0 0 0; color: #831843;">Book your first appointment today and get a special welcome treatment.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}" style="background-color: #1c1917; color: #d4af37; padding: 16px 32px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border-radius: 4px; display: inline-block; border: 1px solid #d4af37;">
            Enter The Sanctuary
          </a>
        </div>
      </div>

      <div style="${styles.footer}">
        &copy; ${new Date().getFullYear()} Flawless Salon. All rights reserved.
      </div>
    </div>
  `;

    await sendEmailViaBrevo(
      email,
      '✨ WE ARE LIVE! Flawless By Drashti is Open',
      htmlContent
    );
  };

  export default {
    sendBookingConfirmation,
    sendBookingRejection,
    sendBookingNotification,
    sendPasswordResetEmail,
    sendLoginSuccessEmail,
    sendWelcomeEmail,
    sendLaunchNotificationEmail
  };
