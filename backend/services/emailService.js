// ✅ Brevo Email Service (API based - works on Render)

class EmailService {
  constructor() {
    this.apiEnabled = !!process.env.BREVO_API_KEY;

    this.fromEmail = process.env.EMAIL_FROM || "tech@growmoreparking.com";
    this.fromName = process.env.EMAIL_FROM_NAME || "Cafe Quattro Babulnath Valet";

    if (this.apiEnabled) {
      console.log("✓ Email Service initialized (Brevo API mode ✅)");
    } else {
      console.log("⚠ Email Service running in MOCK mode (BREVO_API_KEY missing)");
    }
  }

  // ✅ Base send email via Brevo API
  async sendEmail(to, subject, html, text = null) {
    if (!this.apiEnabled) {
      console.log("\n📧 MOCK EMAIL:");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${text || html.substring(0, 200)}...`);
      console.log("─────────────────────────────\n");
      return { success: true, mock: true };
    }

    try {
      console.log("📨 [BREVO] Sending email...");
      console.log("To:", to);
      console.log("From:", this.fromEmail);
      console.log("Subject:", subject);

      const payload = {
        sender: {
          name: this.fromName,
          email: this.fromEmail,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text || undefined,
      };

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log("📩 [BREVO] Status:", response.status);
      console.log("📩 [BREVO] Response:", data);

      if (!response.ok) {
        console.error("❌ Brevo API error:", data);
        return {
          success: false,
          error: data.message || "Brevo API error",
          details: data,
          status: response.status,
        };
      }

      console.log(`✅ [BREVO] Email sent successfully to ${to}`);
      return { success: true, result: data };
    } catch (error) {
      console.error("❌ Brevo sendEmail exception:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ 1) Booking confirmation email
  async sendBookingConfirmation(
    toEmail,
    customerName,
    bookingId,
    accessLink,
    vehicleNumber,
    venue
  ) {
    const subject = `Welcome to Cafe Quattro Babulnath Valet 🚗 — Booking ${bookingId} Confirmed`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Cafe Quattro Babulnath Valet — Booking Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6B3FA0,#9B6DD6);padding:32px 32px 24px;text-align:center;">
            <p style="margin:0 0 6px;font-size:28px;">🚗</p>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:0.5px;">Booking Confirmed!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.88);font-size:14px;">Your car is in safe hands at Cafe Quattro Babulnath</p>
          </td>
        </tr>

        <!-- Greeting & Booking Details -->
        <tr>
          <td style="padding:28px 32px 16px;">
            <p style="margin:0 0 18px;font-size:15px;color:#374151;">Hi <strong>${customerName || 'Customer'}</strong>, welcome to Cafe Quattro Babulnath Valet! 👋</p>

            <!-- Booking Info Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0FF;border-radius:10px;border:1px solid #D4C0F0;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table width="100%" cellpadding="4" cellspacing="0">
                    <tr>
                      <td style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;width:110px;">Booking ID</td>
                      <td style="font-size:15px;color:#6B3FA0;font-weight:800;">${bookingId}</td>
                    </tr>
                    <tr>
                      <td style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Vehicle No.</td>
                      <td style="font-size:14px;color:#1A1A2E;font-weight:700;">${vehicleNumber || '—'}</td>
                    </tr>
                    ${venue ? `<tr><td style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Venue</td><td style="font-size:14px;color:#1A1A2E;">${venue}</td></tr>` : ''}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Steps Section -->
        <tr>
          <td style="padding:0 32px 24px;">
            <p style="margin:0 0 14px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6B3FA0;">How it works — 4 easy steps</p>

            <!-- Step 1 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
              <tr>
                <td style="width:36px;vertical-align:top;">
                  <div style="width:32px;height:32px;background:#6B3FA0;border-radius:50%;text-align:center;line-height:32px;color:white;font-weight:800;font-size:14px;">1</div>
                </td>
                <td style="padding-left:12px;vertical-align:top;">
                  <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#1A1A2E;">Car Parked ✅</p>
                  <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.5;">Your vehicle is now safely parked by our valet driver.</p>
                </td>
              </tr>
            </table>

            <!-- Step 2 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
              <tr>
                <td style="width:36px;vertical-align:top;">
                  <div style="width:32px;height:32px;background:#6B3FA0;border-radius:50%;text-align:center;line-height:32px;color:white;font-weight:800;font-size:14px;">2</div>
                </td>
                <td style="padding-left:12px;vertical-align:top;">
                  <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#1A1A2E;">Request Your Car 🔁</p>
                  <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.5;">When you're ready to leave, click the <strong>Track &amp; Recall</strong> link below to request your car.</p>
                </td>
              </tr>
            </table>

            <!-- Step 3 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
              <tr>
                <td style="width:36px;vertical-align:top;">
                  <div style="width:32px;height:32px;background:#6B3FA0;border-radius:50%;text-align:center;line-height:32px;color:white;font-weight:800;font-size:14px;">3</div>
                </td>
                <td style="padding-left:12px;vertical-align:top;">
                  <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#1A1A2E;">Track in Real Time 📍</p>
                  <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.5;">You'll get an estimated arrival time and can track your car as the driver brings it to you.</p>
                </td>
              </tr>
            </table>

            <!-- Step 4 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td style="width:36px;vertical-align:top;">
                  <div style="width:32px;height:32px;background:#6B3FA0;border-radius:50%;text-align:center;line-height:32px;color:white;font-weight:800;font-size:14px;">4</div>
                </td>
                <td style="padding-left:12px;vertical-align:top;">
                  <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#1A1A2E;">Verify &amp; Drive Away 🔐</p>
                  <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.5;">When your car arrives, you'll receive an OTP. Share it with the driver to verify and collect your vehicle.</p>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${accessLink}" target="_blank"
                    style="display:inline-block;background:linear-gradient(135deg,#6B3FA0,#9B6DD6);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
                    🚗 Track &amp; Recall My Car
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;">Need help? Contact our support at the venue.</p>
            <p style="margin:8px 0 0;font-size:13px;color:#6B7280;font-weight:600;">Team Cafe Quattro Babulnath</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>
    `;

    return await this.sendEmail(toEmail, subject, html);
  }

  // ✅ 2) Recall notification email
  async sendRecallNotification(toEmail, customerName, bookingId, estimatedMinutes) {
    const subject = `Car is On the Way 🚗 (${bookingId})`;

    const html = `
      <h2>Your Car Recall is in progress 🚗</h2>
      <p>Hi <b>${customerName || 'Customer'}</b>,</p>
      <p>Your car has been recalled and is on the way to you.</p>
      <hr/>
      <p><b>Booking ID:</b> ${bookingId}</p>
      <p><b>Estimated Arrival:</b> ${estimatedMinutes} minutes</p>
      <br/>
      <p>Thanks,<br/>Team Cafe Quattro Babulnath</p>
    `;

    return await this.sendEmail(toEmail, subject, html);
  }

  // ✅ 3) Arrival OTP email
  async sendArrivalNotification(toEmail, customerName, bookingId, otp) {
    const subject = `OTP for Car Handover 🔐 (${bookingId})`;

    const html = `
      <h2>Driver Arrived ✅</h2>
      <p>Hi <b>${customerName || 'Customer'}</b>,</p>
      <p>Your driver has arrived. Share this OTP to verify and collect your car.</p>
      <hr/>
      <p><b>Booking ID:</b> ${bookingId}</p>
      <h1 style="letter-spacing: 4px;">${otp}</h1>
      <p><b>OTP Validity:</b> 10 minutes</p>
      <br/>
      <p><b>Note:</b> Do not share OTP with anyone except the Cafe Quattro Babulnath Valet driver.</p>
      <br/>
      <p>Thanks,<br/>Team Cafe Quattro Babulnath</p>
    `;

    return await this.sendEmail(toEmail, subject, html);
  }
}

module.exports = new EmailService();
