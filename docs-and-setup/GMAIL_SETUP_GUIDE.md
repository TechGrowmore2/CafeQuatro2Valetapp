# Email Setup Guide for growmore (GoDaddy/SecureServer)

## 📧 Setting up tech@growmoreparking.com for Email Sending

### Your Email Provider: GoDaddy (secureserver.net)

Since you're using tech@growmoreparking.com hosted on GoDaddy/SecureServer, here's the simple setup:

### Step 1: Get Your Email Password

You already have this! It's the same password you use to login to your email at:
- **Webmail:** https://email.secureserver.net
- Or through Outlook/other email clients

### Step 2: Add to .env File

Edit `backend/.env`:

```env
# Email Configuration (GoDaddy/SecureServer)
EMAIL_HOST=smtpout.secureserver.net
EMAIL_PORT=465
EMAIL_USER=tech@growmoreparking.com
EMAIL_PASS=your_actual_email_password
EMAIL_FROM=tech@growmoreparking.com
EMAIL_FROM_NAME=growmore Parking
```

**That's it! No App Passwords or 2FA needed.**

### Step 3: Test Email

Run the backend server:
```bash
cd backend
npm start
```

You should see:
```
✓ Email Service initialized
```

Create a booking and emails will send!

## 📊 GoDaddy Email Limits

| Limit Type | GoDaddy Email |
|------------|---------------|
| **Emails per day** | 250-1000 (depends on plan) |
| **Rate limit** | ~100/hour |
| **Attachment size** | 20 MB |

**For growmore:**
- 100 bookings/day = 400 emails/day ✅ (within limit for most plans)
- If you hit limits, contact GoDaddy to increase

## ⚙️ GoDaddy SMTP Settings

**Primary (Recommended):**
```env
EMAIL_HOST=smtpout.secureserver.net
EMAIL_PORT=465
```

**Alternative (if 465 doesn't work):**
```env
EMAIL_HOST=smtpout.secureserver.net
EMAIL_PORT=587
```

Both work, but 465 (SSL) is more secure.

## 🔧 Troubleshooting

### "Authentication failed" error
- ✅ Verify EMAIL_USER is exactly: `tech@growmoreparking.com`
- ✅ Use your actual email password (same as webmail login)
- ✅ Check password has no extra spaces

### "Connection timeout" error
- Try PORT 587 instead of 465
- Check firewall isn't blocking SMTP

### Emails going to spam
- ✅ GoDaddy emails have good reputation
- ✅ SPF/DKIM records auto-configured by GoDaddy
- ✅ Rarely goes to spam

### "Too many emails" error
- You hit daily limit
- Wait 24 hours or contact GoDaddy support
- Upgrade to higher plan if needed

## 🎯 Current Setup

**Dual Notification System:**

```javascript
// Every notification sends BOTH:
1. Email (via GoDaddy SMTP) ✅
2. SMS (Mock mode until MSG91 configured) ⏸️
```

**Email Templates Created:**
- ✅ Booking confirmation with access link
- ✅ OTP for customer login
- ✅ Recall notification with ETA
- ✅ Arrival notification with OTP

## ⚡ Quick Start (Right Now)

1. **Get your email password** (same as webmail login)
2. **Add to .env:**
   ```env
   EMAIL_HOST=smtpout.secureserver.net
   EMAIL_PORT=465
   EMAIL_USER=tech@growmoreparking.com
   EMAIL_PASS=your_password_here
   ```
3. **Restart backend server**
4. **Test with a booking** - emails will send!

## 💰 Cost

**GoDaddy Email:** Already included in your domain/hosting plan!
- ✅ No additional cost
- ✅ 250-1000 emails/day depending on plan
- ✅ Professional email from your domain

## 📧 Checking Sent Emails

Login to your email:
1. Go to https://email.secureserver.net
2. Login with tech@growmoreparking.com
3. Check **Sent** folder to verify emails

## ✅ Implementation Status

- ✅ Email service created
- ✅ All templates ready
- ✅ Integrated in all booking flows
- ✅ Configured for GoDaddy/SecureServer
- ⏸️ Waiting for EMAIL_PASS to go live

**Next Step:** Add your email password to `.env` and restart server!
