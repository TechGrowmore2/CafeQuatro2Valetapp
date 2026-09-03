const axios = require('axios');

/**
 * ChatMitra WhatsApp Service — Cafe Quattro Babulnath Valet
 * Sends WhatsApp template messages via ChatMitra API.
 * Falls back to MOCK mode if CHATMITRA_API_KEY or CHATMITRA_API_URL are not set.
 *
 * ✅ Templates registered in ChatMitra dashboard:
 *   - cafe_quattro_otp_20260731010652                    (AUTHENTICATION — APPROVED)
 *   - cafe_quattro_handover_otp_20260731010001           (AUTHENTICATION — APPROVED)
 *   - cafe_quattro_car_arrived_20260731005920            (UTILITY — APPROVED)
 *   - cafe_quattro_recall_notification_20260731005839    (UTILITY — APPROVED)
 *   - cafe_quattro_thank_you_20260731010405              (UTILITY — APPROVED)
 */
class WhatsAppService {
  constructor() {
    this.enabled = !!(
      process.env.CHATMITRA_API_KEY &&
      process.env.CHATMITRA_API_URL
    );

    if (this.enabled) {
      this.apiKey = process.env.CHATMITRA_API_KEY;
      this.apiUrl = process.env.CHATMITRA_API_URL;
      console.log('✓ ChatMitra WhatsApp Service initialized (Cafe Quattro Babulnath Valet)');
      console.log('   API URL:', this.apiUrl);
    } else {
      console.log('⚠ WhatsApp Service running in MOCK mode (CHATMITRA_API_KEY not configured)');
    }
  }

  /**
   * Format phone number to international format required by ChatMitra
   * e.g. "9876543210" → "919876543210"
   */
  _formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  }

  /**
   * Build and send a raw axios POST to ChatMitra.
   * Logs the full request payload and full error response for debugging.
   */
  async _post(payload, templateName) {
    console.log(`\n📤 Sending [${templateName}] →`, JSON.stringify(payload, null, 2));
    try {
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`✓ WhatsApp [${templateName}] OK:`, JSON.stringify(response.data));
      return { success: true, data: response.data };
    } catch (error) {
      const status = error.response?.status;
      const errData = error.response?.data;
      console.error(`✗ WhatsApp [${templateName}] FAILED — HTTP ${status}:`, JSON.stringify(errData));
      console.error('  Full error:', error.message);
      return { success: false, status, error: errData || error.message };
    }
  }

  /**
   * Core method — sends any approved template message (body variables only, no buttons).
   * @param {string} phone         - Recipient phone number (10 digits or with 91)
   * @param {string} templateName  - Exact template name as saved in ChatMitra dashboard
   * @param {string[]} variables   - Array of variable values in order: {{1}}, {{2}}, ...
   */
  async sendTemplate(phone, templateName, variables = []) {
    const to = this._formatPhone(phone);

    if (this.enabled) {
      const payload = {
        recipient_mobile_number: to,
        customer_name: 'Customer',
        messages: [{
          kind: 'template',
          template: {
            name: templateName,
            language: 'en_US',
            components: variables.length > 0
              ? [{
                type: 'body',
                parameters: variables.map(v => ({ type: 'text', text: String(v) }))
              }]
              : []
          }
        }]
      };
      return this._post(payload, templateName);
    } else {
      // ── MOCK mode ──────────────────────────────────────────────
      console.log('\n📲 MOCK WhatsApp (Cafe Quattro Babulnath Valet):');
      console.log(`   To       : ${to}`);
      console.log(`   Template : ${templateName}`);
      if (variables.length) {
        variables.forEach((v, i) => console.log(`   {{${i + 1}}}     : ${v}`));
      }
      console.log('─────────────────────────────\n');
      return { success: true, mock: true };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HIGH-LEVEL METHODS  (one per notification type)
  // ─────────────────────────────────────────────────────────────

  /**
   * Template: cafe_quattro_otp_20260731010652
   * Category: AUTHENTICATION — APPROVED
   * Variables: {{1}} = OTP code
   * Button: Copy Code
   *
   * Message:
   * {{1}} is your verification code.
   * Expires in 1 minute.
   */
  async sendOTP(phone, otp) {
    const to = this._formatPhone(phone);
    if (this.enabled) {
      const payload = {
        recipient_mobile_number: to,
        customer_name: 'Customer',
        messages: [{
          kind: 'template',
          template: {
            name: 'cafe_quattro_otp_20260731010652',
            language: 'en_US',
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: String(otp) }]
              },
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: String(otp) }]
              }
            ]
          }
        }]
      };
      return this._post(payload, 'cafe_quattro_otp_20260731010652');
    } else {
      console.log(`\n📲 MOCK WhatsApp OTP (Cafe Quattro Babulnath Valet): ${otp} to ${phone}\n`);
      return { success: true, mock: true };
    }
  }

  /**
   * Template: cafe_quattro2_booking_confirmation_20260904010926
   * Category: UTILITY - APPROVED
   * Body variables: {{1}} = customerName, {{2}} = bookingId
   * Button (index 0): URL suffix = accessToken (Track my car)
   */
  async sendBookingConfirmation(phone, customerName, bookingId, accessToken) {
    const to = this._formatPhone(phone);

    if (this.enabled) {
      const payload = {
        recipient_mobile_number: to,
        customer_name: customerName || 'Customer',
        messages: [{
          kind: 'template',
          template: {
            name: 'cafe_quattro2_booking_confirmation_20260904010926',
            language: 'en_US',
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: String(customerName || 'Guest') },
                  { type: 'text', text: String(bookingId) }
                ]
              },
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: String(accessToken) }]
              }
            ]
          }
        }]
      };
      return this._post(payload, 'cafe_quattro2_booking_confirmation_20260904010926');
    } else {
      console.log('\n📲 MOCK WhatsApp Booking Confirmation (Cafe Quattro): ' + bookingId + ' to ' + phone + '\n');
      return { success: true, mock: true };
    }
  }

  /**
   * Template: cafe_quattro_recall_notification_20260731005839
   * Category: UTILITY — APPROVED
   * Variables: {{1}} = bookingId, {{2}} = estimatedMinutes
   *
   * Message:
   * 🚗 Your car is on the way!
   * Booking: {{1}}
   * Estimated arrival: {{2}} minutes
   * Please be ready at the pickup point.
   * - Team Cafe Quattro
   */
  async sendRecallNotification(phone, bookingId, estimatedMinutes) {
    return this.sendTemplate(
      phone,
      'cafe_quattro_recall_notification_20260731005839',
      [String(bookingId), String(estimatedMinutes)]
    );
  }

  /**
   * ── ARRIVAL NOTIFICATION — 2 messages sent back-to-back ──────────────
   *
   * MSG 1 — Template: cafe_quattro_car_arrived_20260731005920  (UTILITY — APPROVED)
   * Variables: None
   * Message:
   * ✅ Your car has arrived at the pickup point!
   * You will receive your handover number in the next message.
   * Please have it ready to show the Cafe Quattro valet driver.
   * - Team Cafe Quattro
   *
   * MSG 2 — Template: cafe_quattro_handover_otp_20260731010001  (AUTHENTICATION — APPROVED)
   * Variables: {{1}} = OTP  — Copy Code button
   * Message:
   * {{1}} is your verification code.
   * Expires in 15 minutes.
   */
  async sendArrivalNotification(phone, bookingId, otp) {
    // MSG 1: UTILITY — car arrived notice (no variables)
    const notify = await this.sendTemplate(
      phone,
      'cafe_quattro_car_arrived_20260731005920',
      []
    );

    // MSG 2: AUTHENTICATION — handover OTP with Copy Code button
    const to = this._formatPhone(phone);
    let otpResult;

    if (this.enabled) {
      const payload = {
        recipient_mobile_number: to,
        customer_name: 'Customer',
        messages: [{
          kind: 'template',
          template: {
            name: 'cafe_quattro_handover_otp_20260731010001',
            language: 'en_US',
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: String(otp) }]
              },
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: String(otp) }]
              }
            ]
          }
        }]
      };
      otpResult = await this._post(payload, 'cafe_quattro_handover_otp_20260731010001');
    } else {
      console.log(`\n📲 MOCK WhatsApp Handover OTP (Cafe Quattro Babulnath Valet): ${otp} to ${phone}\n`);
      otpResult = { success: true, mock: true };
    }

    return { notify, otpResult };
  }

  /**
   * Template: cafe_quattro_thank_you_20260731010405
   * Category: UTILITY — APPROVED
   * Variables: {{1}} = customerName, {{2}} = bookingId
   *
   * Message:
   * Thank you for choosing Cafe Quattro Valet, {{1}}! 🙏
   * Your booking {{2}} has been completed successfully.
   * We hope you had a seamless experience.
   * It was our pleasure to serve you — we look forward to seeing you again!
   * – Team Cafe Quattro
   */
  async sendThankYou(phone, customerName, bookingId) {
    return this.sendTemplate(
      phone,
      'cafe_quattro_thank_you_20260731010405',
      [String(customerName || 'Guest'), String(bookingId)]
    );
  }
}

module.exports = new WhatsAppService();
