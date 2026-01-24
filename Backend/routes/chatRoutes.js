import express from 'express';
import axios from 'axios';
import db from '../config/db.js';
import emailService from '../utils/emailService.js';
import whatsappService from '../utils/whatsappService.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
    const { message, isLoggedIn } = req.body;

    try {
        // 1. 📞 Call the Python AI Server
        const pythonUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
        const response = await axios.post(`${pythonUrl}/chat`, {
            message: message,
            is_logged_in: isLoggedIn
        });

        let botReply = response.data.reply;
        console.log("🤖 RAW BOT REPLY:", JSON.stringify(botReply)); // DEBUG LOG

        // 2. 🕵️ Check for Hidden Signal ||ID:123||
        const idMatch = botReply.match(/\|\|ID:\s*(\d+)\|\|/);

        if (idMatch) {
            const bookingId = idMatch[1];
            console.log(`🎉 AI Created Booking #${bookingId}. Triggering Email...`);

            // ✅ FIX 1: Show the Reference Number instead of hiding it
            // Replace the hidden tag with a nice user-friendly message
            botReply = botReply.replace(idMatch[0], `\n\n**Booking Reference: ${bookingId}**`);

            // ✅ FIX 2: Use Async/Await with Promise-based DB
            const sql = `
                SELECT b.*, s.name as service_name, s.price 
                FROM bookings b 
                JOIN services s ON b.service_id = s.id 
                WHERE b.id = ?
            `;

            // Run in background so we don't delay the chat response too much
            // But we catch errors properly
            (async () => {
                try {
                    // db is the promise-based pool
                    const [results] = await db.query(sql, [bookingId]);

                    if (results.length > 0) {
                        const booking = results[0];
                        console.log(`📧 Sending confirmation to ${booking.customer_email}...`);

                        // 1. Send Email
                        await emailService.sendBookingConfirmation(
                            booking,
                            booking.service_name
                        );
                        console.log("✅ Email Sent Successfully!");

                        // 2. Send WhatsApp
                        if (booking.customer_phone) {
                            let phoneToSend = booking.customer_phone;
                            if (!phoneToSend.startsWith('+')) phoneToSend = '+91' + phoneToSend;

                            const waMsg = `Hello ${booking.customer_name}! 👋\n\nYour request for *${booking.service_name}* on ${new Date(booking.booking_date).toDateString()} at ${booking.booking_time} has been received! ⏳\n\nWe will notify you once it is confirmed.`;

                            await whatsappService.sendWhatsappMessage(phoneToSend, waMsg);
                        }

                    } else {
                        console.warn(`⚠️ Booking #${bookingId} not found in DB.`);
                    }
                } catch (err) {
                    console.error("❌ Notification Trigger Error:", err);
                }
            })();
        } else {
            console.log(" No Booking ID found in bot reply.");
        }

        // 3. Send the response (with the Reference # included now)
        res.json({ reply: botReply });

    } catch (error) {
        console.error("❌ Chat Bridge Error:", error.message);

        if (error.code === 'ECONNREFUSED') {
            res.status(503).json({ reply: "The AI system is starting up. Please try again in 10 seconds." });
        } else {
            res.status(500).json({ reply: "I'm having trouble connecting to the system right now." });
        }
    }
});

export default router;
