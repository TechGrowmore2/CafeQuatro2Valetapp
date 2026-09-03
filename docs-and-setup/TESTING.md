# growmore Testing Guide

## Testing Checklist

### 1. Authentication Testing

#### Driver/Supervisor Login
- [ ] Login with correct credentials
- [ ] Login with incorrect phone
- [ ] Login with incorrect password
- [ ] Token persistence after refresh
- [ ] Logout functionality
- [ ] Session timeout

#### Customer Login
- [ ] Request OTP with valid phone
- [ ] Request OTP with invalid phone
- [ ] Verify OTP with correct code
- [ ] Verify OTP with incorrect code
- [ ] OTP expiration (10 minutes)
- [ ] First-time customer registration
- [ ] Returning customer login

### 2. Driver Dashboard Testing

#### Create Booking
- [ ] Create booking with all required fields
- [ ] Create booking with optional fields
- [ ] Validation: Invalid phone number
- [ ] Validation: Invalid vehicle number
- [ ] Customer receives SMS notification
- [ ] Booking ID generated correctly
- [ ] Recall link sent to customer

#### My Bookings
- [ ] View all active bookings
- [ ] Receive recall request notification
- [ ] Set estimated arrival time
- [ ] Mark car as arrived
- [ ] Generate OTP for customer
- [ ] Verify customer OTP
- [ ] Complete booking with cash payment
- [ ] Complete booking with QR payment
- [ ] Booking status updates correctly

### 3. Customer Dashboard Testing

#### View Bookings
- [ ] See all personal bookings
- [ ] View booking details
- [ ] Status updates in real-time

#### Recall Car
- [ ] Send recall request
- [ ] Receive ETA notification
- [ ] Receive arrival notification
- [ ] See verification OTP
- [ ] View completed booking

### 4. Supervisor Dashboard Testing

#### Dashboard View
- [ ] View statistics (today's, active, completed, revenue)
- [ ] See all bookings
- [ ] Filter by status (active/completed/all)
- [ ] Real-time updates on new bookings
- [ ] View driver information
- [ ] Monitor booking progress

### 5. Real-time Features Testing

#### Socket.io Notifications
- [ ] Driver receives recall requests instantly
- [ ] Customer receives ETA updates
- [ ] Customer receives arrival notifications
- [ ] Supervisor sees new bookings
- [ ] Multiple users can work simultaneously
- [ ] Reconnection after disconnect

### 6. Security Testing

#### Authentication
- [ ] Cannot access protected routes without token
- [ ] Role-based access control works
- [ ] Token expiration handled correctly
- [ ] Password hashing verified

#### Input Validation
- [ ] SQL injection prevention
- [ ] XSS attack prevention
- [ ] CSRF protection
- [ ] Rate limiting works

### 7. Performance Testing

#### Load Testing
- [ ] Multiple drivers creating bookings simultaneously
- [ ] Multiple customers logging in
- [ ] Database queries optimized
- [ ] Socket connections stable with multiple users

#### Mobile Responsiveness
- [ ] All pages responsive on mobile
- [ ] Touch interactions work
- [ ] Forms usable on small screens
- [ ] Navigation accessible

### 8. Production Deployment Testing

#### Render Deployment
- [ ] App builds successfully
- [ ] Environment variables set correctly
- [ ] Static files served correctly
- [ ] Socket.io connects in production
- [ ] MongoDB connection stable
- [ ] HTTPS working
- [ ] No console errors

#### Free Tier Compatibility
- [ ] App wakes from sleep within acceptable time
- [ ] Persistent data in MongoDB
- [ ] Multiple concurrent users supported
- [ ] Bandwidth within limits

### 9. Edge Cases Testing

- [ ] Network disconnection handling
- [ ] Browser refresh during booking
- [ ] Expired OTP scenario
- [ ] Duplicate booking prevention
- [ ] Concurrent recall requests
- [ ] Payment without OTP verification (should fail)

### 10. User Experience Testing

- [ ] Loading states visible
- [ ] Error messages clear and helpful
- [ ] Success confirmations displayed
- [ ] Smooth transitions and animations
- [ ] Intuitive navigation
- [ ] Accessibility (keyboard navigation, screen readers)

## Test Scenarios

### Scenario 1: Complete Booking Flow
1. Driver creates booking for customer
2. Customer receives SMS with link
3. Customer logs in via OTP
4. Customer views booking details
5. Customer recalls car
6. Driver sets ETA
7. Customer receives notification
8. Driver marks arrived
9. Customer receives OTP
10. Driver enters OTP and completes payment
11. Both see completed booking

### Scenario 2: Multiple Concurrent Users
1. Multiple drivers create bookings
2. Multiple customers log in
3. Supervisor monitors all activity
4. Real-time updates work for all users
5. No data conflicts

### Scenario 3: Error Recovery
1. Customer loses network during booking
2. Reconnects and sees updated status
3. OTP expires, needs to re-request
4. App recovers gracefully

## Automated Testing Commands

```bash
# Backend tests (if implemented)
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests (if implemented)
npm run test:e2e
```

## Manual Testing Checklist

Print this checklist and test each item:

**Driver Flow:**
- [ ] Login successful
- [ ] Create 3 test bookings
- [ ] Handle recall for each
- [ ] Complete all bookings

**Customer Flow:**
- [ ] Login with OTP
- [ ] View bookings
- [ ] Recall car
- [ ] Verify completion

**Supervisor Flow:**
- [ ] View dashboard
- [ ] Monitor all bookings
- [ ] Check statistics accuracy

**Cross-browser Testing:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers

## Bug Reporting

When you find a bug, document:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Screenshots/videos
5. Browser/device info
6. Console errors

## Performance Benchmarks

Target metrics:
- Page load: < 3 seconds
- API response: < 500ms
- Socket latency: < 100ms
- Wake from sleep: < 60 seconds (Render free tier)
