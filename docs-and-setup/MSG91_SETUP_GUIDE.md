# MSG91 SMS Integration Guide for growmore

## Why MSG91?

MSG91 is the **most affordable** SMS service for India with:
- ✅ **₹0.15-₹0.20 per SMS** (vs Twilio's ₹0.50+)
- ✅ **Free credits** for new signups (₹50-₹100)
- ✅ **Indian phone numbers** - No international setup needed
- ✅ **DLT compliant** - Required for commercial SMS in India
- ✅ **High delivery rate** in India
- ✅ **Pay-as-you-go** - No monthly fees

## Setup Steps

### 1. Create MSG91 Account
1. Go to [https://msg91.com](https://msg91.com)
2. Click **Sign Up**
3. Enter your details:
   - Email address
   - Password
   - Company name: `growmore`
4. Verify your email
5. Complete mobile verification

### 2. Get Free Credits

- New accounts get **₹50-₹100 free credits**
- Enough for **250-500 test SMS**

### 3. Get Your Credentials

#### A. Get AUTH KEY
1. Login to MSG91 dashboard
2. Go to **Settings** → **API Keys**
3. Copy your **authkey**
4. Add to `.env`:
   ```
   MSG91_AUTH_KEY=your_actual_auth_key_here
   ```

#### B. Get/Create Sender ID
1. Go to **SMS** → **Sender ID**
2. You'll see default sender IDs or create new:
   - Click **Add New Sender ID**
   - Enter: `VLTZVA` (6 characters, uppercase)
   - Purpose: `Transactional`
   - Click **Submit**
3. Wait for approval (usually 1-2 hours, can take up to 24 hours)
4. Default is already set in `.env`:
   ```
   MSG91_SENDER_ID=VLTZVA
   ```

#### C. Get/Create Template ID (Optional for basic SMS)
1. Go to **SMS** → **Templates**
2. Click **Create Template**
3. Template example for OTP:
   ```
   Your growmore verification OTP is: ##var1##. Valid for 10 minutes. Do not share this code.
   ```
4. Submit for approval
5. Copy Template ID once approved
6. Add to `.env`:
   ```
   MSG91_TEMPLATE_ID=your_template_id_here
   ```

**Note:** For development, you can use the `sendSimpleSMS` method which doesn't require template approval.

### 4. Configure Environment Variables

Edit `backend/.env`:

```env
# MSG91 Configuration
MSG91_AUTH_KEY=your_actual_auth_key_from_dashboard
MSG91_SENDER_ID=VLTZVA
MSG91_TEMPLATE_ID=leave_empty_for_now_or_your_template_id
```

### 5. Testing

The SMS service automatically uses **MOCK mode** if credentials are not set:

#### Development (Mock Mode)
- No credentials needed
- SMS logged to console only
- Free testing

#### Production (Real SMS)
- Add MSG91 credentials to `.env`
- SMS will be sent via MSG91
- Costs apply (₹0.15-₹0.20 per SMS)

### 6. Cost Estimation

| Usage | SMS/Month | Cost/Month |
|-------|-----------|------------|
| Small (50 customers) | ~200 SMS | ₹30-40 |
| Medium (200 customers) | ~800 SMS | ₹120-160 |
| Large (1000 customers) | ~4000 SMS | ₹600-800 |

**SMS Breakdown per Customer:**
- 1 OTP for login
- 1 Booking confirmation
- 0-1 Recall notification (if recalled)
- 1 Arrival notification with OTP
- **Average: 3-4 SMS per customer**

### 7. DLT Registration (Required for Production in India)

For commercial SMS in India, you need DLT (Distributed Ledger Technology) registration:

1. **Register on DLT Platform:**
   - Go to your telecom operator's DLT portal
   - Common: [Vilpower](https://www.vilpower.in), [Videocon](https://www.vdotel.in)
   - Register your business

2. **Register Templates:**
   - Register all SMS templates with DLT
   - Get DLT Template IDs
   - Update in MSG91

3. **Register Sender ID:**
   - Register `VLTZVA` on DLT
   - Link with MSG91

**Note:** MSG91 supports DLT and will guide you through this process.

### 8. Advanced Features (Optional)

#### A. OTP Service (No template needed)
MSG91 has a dedicated OTP service:
```javascript
// In smsService.js, you can use MSG91's OTP API
POST https://control.msg91.com/api/v5/otp
```

#### B. SMS Templates
Create templates for:
- Welcome message
- Booking confirmation
- Recall notification
- Arrival with OTP
- Payment receipt

#### C. Reports & Analytics
- Login to MSG91 dashboard
- View delivery reports
- Track SMS costs
- Monitor failures

### 9. Production Checklist

Before going live:
- [ ] MSG91 account created
- [ ] Email verified
- [ ] Phone verified
- [ ] AUTH_KEY obtained
- [ ] Sender ID approved
- [ ] Templates created (optional)
- [ ] DLT registration done (for India)
- [ ] Environment variables set
- [ ] Test SMS sent successfully
- [ ] Credits recharged (₹500-₹1000 recommended to start)

### 10. Recharge & Billing

1. **Add Credits:**
   - Dashboard → **Wallet** → **Add Money**
   - Minimum: ₹500
   - Recommended starting amount: ₹1000

2. **Payment Methods:**
   - Credit/Debit Card
   - Net Banking
   - UPI
   - Paytm

3. **Auto-Recharge:**
   - Set up auto-recharge at ₹500 threshold
   - Ensures uninterrupted service

### 11. Troubleshooting

#### SMS not sending?
1. Check AUTH_KEY is correct
2. Verify Sender ID is approved
3. Check phone number format (must start with 91)
4. Verify you have credits in wallet

#### "Sender ID not approved"?
- Wait 24-48 hours for approval
- Contact MSG91 support if delayed

#### DLT errors?
- Ensure templates registered on DLT
- Verify DLT Template IDs match

### 12. Support

- **MSG91 Support:** support@msg91.com
- **Documentation:** [https://docs.msg91.com](https://docs.msg91.com)
- **WhatsApp Support:** Available in dashboard
- **Phone:** +91-9650-685-400

## Current Implementation Status

✅ SMS Service updated to use MSG91  
✅ Axios installed for API calls  
✅ Environment variables configured  
✅ Template variables ready  
✅ Mock mode for development  
✅ Production ready with credentials  

## Next Steps

1. Create MSG91 account
2. Get AUTH_KEY
3. Wait for Sender ID approval
4. Add credentials to `.env`
5. Test with your phone number
6. Recharge wallet before production
7. Complete DLT registration for India

**Estimated setup time:** 30 minutes + 24 hours for approvals
