const axios = require('axios');

class SMSService {
  constructor() {
    this.msg91Enabled = !!(
      process.env.MSG91_AUTH_KEY && 
      process.env.MSG91_SENDER_ID &&
      process.env.MSG91_TEMPLATE_ID
    );

    if (this.msg91Enabled) {
      this.authKey = process.env.MSG91_AUTH_KEY;
      this.senderId = process.env.MSG91_SENDER_ID;
      this.templateId = process.env.MSG91_TEMPLATE_ID;
      this.baseUrl = 'https://control.msg91.com/api/v5';
      console.log('✓ MSG91 SMS Service initialized');
    } else {
      console.log('⚠ SMS Service running in MOCK mode (MSG91 not configured)');
    }
  }

  async sendSMS(to, message, templateId = null) {
    if (this.msg91Enabled) {
      try {
        // Ensure phone number starts with country code (91 for India)
        const formattedPhone = to.startsWith('91') ? to : `91${to}`;
        
        const payload = {
          template_id: templateId || this.templateId,
          sender: this.senderId,
          short_url: '0',
          mobiles: formattedPhone,
          var1: message // For dynamic template variables
        };

        const response = await axios.post(
          `${this.baseUrl}/flow/`,
          payload,
          {
            headers: {
              'authkey': this.authKey,
              'content-type': 'application/json'
            }
          }
        );

        console.log(`SMS sent to ${to}: ${response.data.type}`);
        return { success: true, data: response.data };
      } catch (error) {
        console.error('MSG91 Error:', error.response?.data || error.message);
        return { success: false, error: error.message };
      }
    } else {
      // Mock SMS for development
      console.log('\n📱 MOCK SMS:');
      console.log(`To: ${to}`);
      console.log(`Message: ${message}`);
      console.log('─────────────────────────────\n');
      return { success: true, mock: true };
    }
  }

  // Alternative method using MSG91 SMS API (without template)
  async sendSimpleSMS(to, message) {
    if (this.msg91Enabled) {
      try {
        const formattedPhone = to.startsWith('91') ? to : `91${to}`;
        
        const response = await axios.get(
          `https://api.msg91.com/api/sendhttp.php`,
          {
            params: {
              authkey: this.authKey,
              mobiles: formattedPhone,
              message: message,
              sender: this.senderId,
              route: '4', // Transactional route
              country: '91'
            }
          }
        );

        console.log(`Simple SMS sent to ${to}`);
        return { success: true, data: response.data };
      } catch (error) {
        console.error('MSG91 Simple SMS Error:', error.message);
        return { success: false, error: error.message };
      }
    } else {
      return this.sendSMS(to, message);
    }
  }

  async sendOTP(phone, otp) {
    const message = `Your Cafe Quattro Babulnath Valet verification OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    return this.sendSimpleSMS(phone, message);
  }

  async sendBookingConfirmation(phone, bookingId, recallLink) {
    const message = `Cafe Quattro Babulnath Valet: Your booking ${bookingId} is confirmed! Track and recall your car: ${recallLink} - Team Cafe Quattro`;
    return this.sendSimpleSMS(phone, message);
  }

  async sendRecallNotification(phone, bookingId, estimatedTime) {
    const message = `Cafe Quattro Babulnath Valet: Your car (${bookingId}) will arrive in ${estimatedTime} minutes. - Team Cafe Quattro`;
    return this.sendSimpleSMS(phone, message);
  }

  async sendArrivalNotification(phone, bookingId, otp) {
    const message = `Cafe Quattro Babulnath Valet: Your car has arrived! Verification OTP: ${otp}. Do not share with anyone. - Team Cafe Quattro`;
    return this.sendSimpleSMS(phone, message);
  }
}

module.exports = new SMSService();
