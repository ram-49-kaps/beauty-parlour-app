import { query } from '../config/db.js';
import emailService from '../utils/emailService.js';
import whatsappService from '../utils/whatsappService.js';

// --- Helper Function ---
const calculateEndTime = (date, time, duration) => {
  const startDateTimeString = `${date}T${time}`;
  const startDate = new Date(startDateTimeString);

  if (isNaN(startDate.getTime())) {
    return null;
  }

  const endDate = new Date(startDate.getTime() + duration * 60000);
  return endDate;
};


// --------------------- GET BOOKED SLOTS (For UI Blocking) ---------------------
export const getBookedSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const queryStr = `
      SELECT booking_time, s.duration 
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE booking_date = ? 
      AND b.status NOT IN ('rejected', 'cancelled')
    `;

    const bookings = await query(queryStr, [date]);

    // Return simple array of blocked times
    const slots = bookings.map(b => ({
      time: b.booking_time, // e.g., "10:00:00"
      duration: b.duration
    }));

    res.json(slots);
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ message: 'Error fetching blocks' });
  }
};

// --------------------- CREATE BOOKING ---------------------
export const createBooking = async (req, res) => {
  try {
    // UPDATED: Added user_id to destructuring
    const { customer_name, customer_email, customer_phone, service_id, booking_date, booking_time, notes, user_id } = req.body;

    // 1. Input Validation
    if (!customer_name || !customer_email || !service_id || !booking_date || !booking_time) {
      return res.status(400).json({ message: 'Missing required fields: name, email, service, date, or time.' });
    }

    // 2. Get service details
    const services = await query('SELECT * FROM services WHERE id = ?', [service_id]);

    if (services.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    const service = services[0];
    const serviceDuration = service.duration;

    // 3. Calculate Proposed Booking Times
    const proposedBookingStart = calculateEndTime(booking_date, booking_time, 0);
    const proposedBookingEnd = calculateEndTime(booking_date, booking_time, serviceDuration);

    if (!proposedBookingStart || !proposedBookingEnd) {
      return res.status(400).json({ message: 'Invalid date or time format provided.' });
    }

    // --- 4. ROBUST CONFLICT CHECK ---
    const conflictCheckQuery = `
        SELECT 
            b.*, 
            s.duration 
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.booking_date = ? 
        AND b.status != 'rejected'
    `;

    const existingBookings = await query(conflictCheckQuery, [booking_date]);

    const proposedStartMs = proposedBookingStart.getTime();
    const proposedEndMs = proposedBookingEnd.getTime();

    const isConflict = existingBookings.some(existing => {
      const existingStart = calculateEndTime(existing.booking_date, existing.booking_time, 0);
      const existingEnd = calculateEndTime(existing.booking_date, existing.booking_time, existing.duration);

      if (!existingStart || !existingEnd) return false;

      const existingStartMs = existingStart.getTime();
      const existingEndMs = existingEnd.getTime();

      return proposedStartMs < existingEndMs && proposedEndMs > existingStartMs;
    });


    if (isConflict) {
      return res.status(409).json({ message: 'This time slot overlaps with an existing appointment.' });
    }

    // 5. Create booking
    const bookingNotes = notes === undefined ? null : notes;
    const bookingPhone = customer_phone === undefined ? null : customer_phone;
    // UPDATED: Handle user_id (it might be undefined if user is guest)
    const registeredUserId = user_id === undefined ? null : user_id;

    // UPDATED: Added user_id to INSERT query
    const result = await query(
      `INSERT INTO bookings (customer_name, customer_email, customer_phone, service_id, 
       booking_date, booking_time, notes, total_amount, status, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_name, customer_email, bookingPhone, service_id, booking_date, booking_time, bookingNotes, service.price, 'pending', registeredUserId]
    );

    const booking = {
      id: result.insertId,
      customer_name,
      customer_email,
      customer_phone: bookingPhone,
      service_id,
      booking_date,
      booking_time,
      notes: bookingNotes,
      total_amount: service.price,
      status: 'pending',
      user_id: registeredUserId
    };

    // ✅ Response Sent Immediately (Fix for stuck loader)
    res.status(201).json({
      message: 'Booking created successfully',
      booking: { ...booking, service_name: service.name }
    });

    // 📩 Send Notifications (Async Background Process)
    (async () => {
      try {
        // 1. Email
        await emailService.sendBookingNotification(booking, service.name);

        // 2. WhatsApp
        if (bookingPhone) {
          // Prepare object with service name for the template
          const bookingForNotify = { ...booking, service_name: service.name };
          await whatsappService.sendBookingStatusMessage(bookingForNotify, 'pending');
        }
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
      }
    })();

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Error creating booking' });
  }
};


// --------------------- GET ALL BOOKINGS (Admin) ---------------------
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await query(`
      SELECT b.*, s.name as service_name, s.duration, s.image_url
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `);

    res.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};


// --------------------- GET USER BOOKINGS (New Feature) ---------------------
export const getUserBookings = async (req, res) => {
  try {
    // req.user is populated by the authenticateToken middleware
    const userId = req.user.id;

    const bookings = await query(`
      SELECT 
        b.id, 
        b.booking_date as date, 
        b.booking_time as time, 
        b.status, 
        s.name as service_name, 
        s.price 
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `, [userId]);

    res.json(bookings);
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ message: 'Error fetching your bookings' });
  }
};


// --------------------- UPDATE BOOKING STATUS ---------------------
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    const allowedStatuses = ['pending', 'confirmed', 'rejected', 'completed', 'cancelled'];

    if (!status) {
      return res.status(400).json({ message: 'Missing required field: status.' });
    }
    const finalStatus = status.toLowerCase();

    if (!allowedStatuses.includes(finalStatus)) {
      return res.status(400).json({ message: `Invalid status provided. Must be one of: ${allowedStatuses.join(', ')}.` });
    }

    const bookings = await query(`
      SELECT b.*, s.name as service_name
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.id = ?
    `, [id]);

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = bookings[0];

    let finalReason = null;
    if (finalStatus === 'rejected') {
      finalReason = rejection_reason === undefined ? null : rejection_reason;
    }

    await query('UPDATE bookings SET status = ?, rejection_reason = ? WHERE id = ?', [finalStatus, finalReason, id]);

    // ✅ Response Sent Immediately (Fix for stuck loader in Admin)
    res.json({
      message: `Booking ${finalStatus} successfully`,
      booking: { ...booking, status: finalStatus }
    });

    // 📩 Send Notifications (Async Background Process)
    (async () => {
      try {
        const phoneToSend = booking.customer_phone.startsWith('+') ? booking.customer_phone : '+91' + booking.customer_phone;

        // Update the booking object in memory so the PDF/Notification has the NEW status
        const updatedBooking = { ...booking, status: finalStatus };
        // Also update the reason if rejected, for the notification template
        if (finalStatus === ('rejected')) updatedBooking.rejection_reason = finalReason;

        if (finalStatus === 'confirmed') {
          // 1. Email (Now generates PDF internally with 'confirmed' status)
          await emailService.sendBookingConfirmation(updatedBooking, updatedBooking.service_name);

          // 2. WhatsApp (Rich Template)
          await whatsappService.sendBookingStatusMessage(updatedBooking, 'confirmed');

        } else if (finalStatus === 'rejected') {
          // 1. Email - Now we attach PDF even for rejection per user request
          await emailService.sendBookingRejection(updatedBooking, updatedBooking.service_name, finalReason);

          // 2. WhatsApp
          await whatsappService.sendBookingStatusMessage(updatedBooking, 'rejected');
        }
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
      }
    })();

  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Error updating booking' });
  }
};


// NEW: Reschedule an existing booking
export const rescheduleBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { booking_date, booking_time } = req.body;
    const userId = req.user.id; // Get logged in user ID

    // 1. Validate inputs
    if (!booking_date || !booking_time) {
      return res.status(400).json({ message: 'New date and time are required.' });
    }

    // 2. Check if booking exists and belongs to user (Security Check)
    const bookingCheck = await query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [id, userId]);

    if (bookingCheck.length === 0) {
      return res.status(404).json({ message: 'Booking not found or unauthorized.' });
    }

    // 3. Update the booking
    // We also set status to 'pending' so admin sees the change needs approval
    await query(
      'UPDATE bookings SET booking_date = ?, booking_time = ?, status = ? WHERE id = ?',
      [booking_date, booking_time, 'pending', id]
    );

    // 4. Return success
    // (Optional: You could trigger an email notification here)
    res.json({
      message: 'Appointment rescheduled successfully',
      booking: { id, booking_date, booking_time, status: 'pending' }
    });

  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({ message: 'Server error while rescheduling' });
  }
};

// --------------------- DASHBOARD STATS ---------------------
export const getDashboardStats = async (req, res) => {
  try {
    const totalBookings = await query('SELECT COUNT(*) as count FROM bookings');
    const pendingBookings = await query('SELECT COUNT(*) as count FROM bookings WHERE status = ?', ['pending']);
    const confirmedBookings = await query('SELECT COUNT(*) as count FROM bookings WHERE status = ?', ['confirmed']);
    const totalEarnings = await query('SELECT SUM(total_amount) as total FROM bookings WHERE status IN (?, ?)', ['confirmed', 'completed']);

    const recentBookings = await query(`
      SELECT b.*, s.name as service_name
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    res.json({
      totalBookings: totalBookings[0].count,
      pendingBookings: pendingBookings[0].count,
      confirmedBookings: confirmedBookings[0].count,
      totalEarnings: totalEarnings[0].total || 0,
      recentBookings
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};
// ... existing imports

// [KEEP ALL YOUR EXISTING FUNCTIONS HERE: createBooking, getAllBookings, etc.]

// --------------------- DELETE BOOKING (Admin Only) ---------------------
// --------------------- DELETE BOOKING (Admin Only) ---------------------
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    // Execute Delete Query
    const result = await query('DELETE FROM bookings WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: 'Booking deleted permanently' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ message: 'Error deleting booking' });
  }
};

// --------------------- RESET ALL DATA (Production Ready) ---------------------
export const resetAllBookings = async (req, res) => {
  try {
    // ⚠️ DANGER: This wipes the entire table
    await query('TRUNCATE TABLE bookings');
    res.json({ message: 'All bookings wiped. Revenue reset to 0.' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ message: 'Error resetting data' });
  }
};