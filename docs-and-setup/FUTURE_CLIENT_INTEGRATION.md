# How to Add Public Data Link API to Future Client WebApps

Use the prompt below when setting up a new client web application. Paste it directly into your AI assistant or follow the manual steps.

---

## 📋 Copy & Paste Prompt for AI Assistant

```markdown
Add a secured `/api/public-data` read-only integration route to this project for the GrowMore Central Admin Panel.

Here are the exact requirements:

1. **Create `backend/routes/publicData.js`**:
   - Protect all routes in this file with an `X-API-KEY` header middleware validating against `process.env.PUBLIC_DATA_API_KEY`.
   - Return 401 if key is invalid or missing.
   - Return 503 if `PUBLIC_DATA_API_KEY` is not set on the server.
   - Implement the following read-only endpoints:
     - `GET /api/public-data/health`: Returns `{ status: 'OK', app: process.env.APP_NAME, database: 'connected', timestamp }`
     - `GET /api/public-data/summary`: Returns today's & all-time booking counts, revenue, active bookings count, status breakdown, and payment method breakdown.
     - `GET /api/public-data/bookings`: Paginated list of bookings supporting `from`, `to`, `status`, `page`, `limit`.
     - `GET /api/public-data/revenue`: Detailed revenue analytics supporting `from`, `to`, returning summary totals, payment method split, payment status split, and hourly (<=3 days) or daily breakdown.
     - `GET /api/public-data/users`: Returns list of drivers, supervisors, and managers with today's booking counts per driver.
     - `GET /api/public-data/venues`: Returns list of venues with fee settings, parking spots, and today's revenue.

2. **Register in `backend/server.js`**:
   - Add CORS origin support for `process.env.ADMIN_PANEL_URL`.
   - Register route: `app.use("/api/public-data", require("./routes/publicData"));`.

3. **Update Environment Variables**:
   - Add `PUBLIC_DATA_API_KEY` (generate strong 64-char hex key).
   - Add `ADMIN_PANEL_URL` (URL of GrowMore Admin Panel).
   - Add `APP_NAME` (Human readable client name).
```

---

## 🛠 Manual Step-by-Step Setup Guide

### Step 1: Generate API Key
Run this in your terminal to generate a secure random API key for the new client:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Set Environment Variables on Client App (Render / Vercel / VPS)
In the client app's `.env` or Render environment settings, set:
- `PUBLIC_DATA_API_KEY`: *(The generated hex string from Step 1)*
- `ADMIN_PANEL_URL`: `https://growmore-admin-panel.onrender.com` *(or your admin panel URL)*
- `APP_NAME`: `Client Brand Name` (e.g. `Benne Cafe Valet`)

### Step 3: Add Client to GrowMore Admin Panel
1. Open the GrowMore Admin Panel dashboard.
2. Go to **Manage Clients** → Click **+ Add Client**.
3. Fill in:
   - **Client Name**: `Client Brand Name`
   - **API Base URL**: `https://client-app.onrender.com`
   - **API Key**: *(The generated API key from Step 1)*
4. Click **Add Client**, then click **🔌 Test** to verify connection.
