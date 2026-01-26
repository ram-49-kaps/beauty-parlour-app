import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Twilio Client
// If credentials are missing, we gracefully skip sending messages (Placeholder Mode)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Default Sandbox

let client = null;
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
    console.log("✅ Twilio WhatsApp Service Initialized");
} else {
    console.warn("⚠️ Twilio Credentials Missing. WhatsApp messages will NOT be sent.");
}

const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    let p = phone.replace(/\D/g, ''); // Remove non-digits
    if (p.length === 10) p = '91' + p; // Default to India
    return `whatsapp:+${p}`;
};

const sendWhatsappMessage = async (to, body) => {
    if (!client) {
        console.log(`[MOCK WA] To: ${to} | Body: \n${body}`);
        return;
    }

    try {
        const finalTo = formatPhoneNumber(to.replace('whatsapp:', ''));

        const message = await client.messages.create({
            body: body,
            from: fromNumber,
            to: finalTo
        });
        console.log(`WhatsApp Sent! SID: ${message.sid}`);
    } catch (error) {
        console.error("❌ WhatsApp Send Failed:", error.message);
    }
};

const sendBookingStatusMessage = async (booking, type) => {
    const { customer_name, customer_phone, id, booking_date, booking_time, total_amount, service_name } = booking;

    let messageBody = '';
    const dateStr = new Date(booking_date).toDateString();

    if (type === 'pending') {
        messageBody = `*Booking Request Received*
-----------------------------
Hi ${customer_name},

Your appointment request is under review! 

*Ref No:* FLAW-${id}
*Service:* ${service_name}
*Date:* ${dateStr}
*Time:* ${booking_time}
*Amount:* ₹${total_amount}

We will confirm your slot shortly.
-----------------------------
*Flawless Salon* 💖`;
    } else if (type === 'confirmed') {
        messageBody = ` *Booking Confirmed!* 
-----------------------------
Hi ${customer_name},

Your appointment has been approved! 

*Ref No:* FLAW-${id}
*Service:* ${service_name}
*Date:* ${dateStr}
*Time:* ${booking_time}
*Total:* ₹${total_amount}

*Location:* Gangotri Society, Bhatar
Please arrive 5 mins early.
-----------------------------
*Flawless Salon*`;
    } else if (type === 'rejected') {
        messageBody = `*Booking Update* 
-----------------------------
Hi ${customer_name},

Unfortunately, we could not confirm your booking for *${service_name}* on ${dateStr}. 

*Reason:* ${booking.rejection_reason || 'Slot not available'}

Please try selecting a different time.
-----------------------------
*Flawless Salon*`;
    }

    if (messageBody) {
        await sendWhatsappMessage(customer_phone, messageBody);
    }
};

export default {
    sendWhatsappMessage,
    sendBookingStatusMessage
};

