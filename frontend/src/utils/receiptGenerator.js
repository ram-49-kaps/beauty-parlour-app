// Receipt Generator - Creates a downloadable PDF-style receipt
export const generateReceipt = (booking) => {
  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const statusColor = {
    pending: '#f59e0b',
    confirmed: '#22c55e',
    completed: '#3b82f6',
    rejected: '#ef4444',
    cancelled: '#6b7280'
  };

  const paymentBadge = {
    advance_paid: { text: '50% Advance Paid', color: '#f59e0b' },
    fully_paid: { text: 'Fully Paid', color: '#22c55e' },
    unpaid: { text: 'Unpaid', color: '#ef4444' }
  };

  const ps = paymentBadge[booking.payment_status] || paymentBadge.unpaid;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - Flawless By Drashti</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f5f5f4; padding: 40px; color: #1c1917; }
    .receipt { max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #1c1917; color: white; padding: 32px; text-align: center; }
    .header h1 { font-size: 24px; font-weight: 300; letter-spacing: 8px; text-transform: uppercase; margin-bottom: 4px; }
    .header p { font-size: 10px; letter-spacing: 3px; color: #a8a29e; text-transform: uppercase; }
    .badge-row { display: flex; justify-content: center; gap: 8px; margin-top: 16px; }
    .badge { padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .body { padding: 32px; }
    .receipt-id { text-align: center; font-size: 11px; color: #78716c; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed #e7e5e4; }
    .receipt-id strong { color: #1c1917; font-size: 13px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #a8a29e; margin-bottom: 12px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
    .row .label { color: #78716c; }
    .row .value { font-weight: 600; color: #1c1917; text-align: right; }
    .divider { border: none; border-top: 1px dashed #e7e5e4; margin: 16px 0; }
    .total-section { background: #fafaf9; border-radius: 12px; padding: 20px; margin-top: 8px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .total-row .label { color: #78716c; }
    .total-row .value { font-weight: 600; }
    .discount-row .value { color: #f59e0b; }
    .grand-total { display: flex; justify-content: space-between; padding: 12px 0 0; margin-top: 8px; border-top: 2px solid #1c1917; font-size: 16px; font-weight: 700; }
    .payment-split { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e7e5e4; }
    .payment-split .row { font-size: 12px; }
    .advance { color: #22c55e; }
    .remaining { color: #f59e0b; }
    .footer { text-align: center; padding: 24px 32px 32px; border-top: 1px dashed #e7e5e4; }
    .footer p { font-size: 11px; color: #a8a29e; line-height: 1.6; }
    .footer .brand { font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: #d6d3d1; margin-top: 16px; }
    @media print { body { padding: 0; background: white; } .receipt { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>Flawless</h1>
      <p>By Drashti</p>
      <div class="badge-row">
        <span class="badge" style="background:${statusColor[booking.status] || '#6b7280'}; color:white;">${(booking.status || 'pending').toUpperCase()}</span>
        <span class="badge" style="background:${ps.color}22; color:${ps.color}; border:1px solid ${ps.color}44;">${ps.text}</span>
      </div>
    </div>
    <div class="body">
      <div class="receipt-id">
        Booking ID: <strong>#FBD-${String(booking.id).padStart(4, '0')}</strong>
        ${booking.razorpay_payment_id ? `<br>Payment ID: <strong>${booking.razorpay_payment_id}</strong>` : ''}
      </div>
      
      <div class="section">
        <div class="section-title">Appointment Details</div>
        <div class="row"><span class="label">Service</span><span class="value">${booking.service_name}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${formatDate(booking.date)}</span></div>
        <div class="row"><span class="label">Time</span><span class="value">${formatTime(booking.time)}</span></div>
        ${booking.duration ? `<div class="row"><span class="label">Duration</span><span class="value">${booking.duration} Minutes</span></div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Client Information</div>
        <div class="row"><span class="label">Name</span><span class="value">${booking.customer_name || '-'}</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${booking.customer_email || '-'}</span></div>
        ${booking.customer_phone ? `<div class="row"><span class="label">Phone</span><span class="value">${booking.customer_phone}</span></div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Payment Breakdown</div>
        <div class="total-section">
          <div class="total-row"><span class="label">Service Price</span><span class="value">₹${parseFloat(booking.total_amount || booking.price || 0).toFixed(2)}</span></div>
          ${booking.discount_amount > 0 ? `<div class="total-row discount-row"><span class="label">Discount ${booking.coupon_code ? '(' + booking.coupon_code + ')' : ''}</span><span class="value">-₹${parseFloat(booking.discount_amount).toFixed(2)}</span></div>` : ''}
          <div class="grand-total"><span>Total</span><span>₹${(parseFloat(booking.total_amount || 0) - parseFloat(booking.discount_amount || 0)).toFixed(2)}</span></div>
          <div class="payment-split">
            <div class="row"><span class="label advance">✓ Advance Paid (50%)</span><span class="value advance">₹${parseFloat(booking.advance_amount || 0).toFixed(2)}</span></div>
            <div class="row"><span class="label remaining">○ Due After Service</span><span class="value remaining">₹${parseFloat(booking.remaining_amount || 0).toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>Thank you for choosing Flawless By Drashti.<br>Please arrive 10 minutes before your scheduled time.</p>
      <p class="brand">Flawless By Drashti • Surat, India</p>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onafterprint = () => { URL.revokeObjectURL(url); };
  }
};
