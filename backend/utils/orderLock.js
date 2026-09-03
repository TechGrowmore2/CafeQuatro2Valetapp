/**
 * Shared in-memory lock for Razorpay order processing.
 * 
 * Both the webhook handler (payment.js) and the public booking redirect handler (bookings.js)
 * can fire almost simultaneously for the same payment. This module provides a shared,
 * process-level lock so only ONE of them proceeds to create a booking document.
 *
 * Node.js module caching guarantees both route files share the same Map instance.
 */

const processingOrders = new Map(); // orderId -> lockedAt (timestamp)

/**
 * Try to acquire the lock for an orderId.
 * Returns true if the lock was acquired (caller should proceed to create booking).
 * Returns false if the lock is held (caller should wait, then fetch existing booking).
 */
function acquireOrderLock(orderId) {
  if (processingOrders.has(orderId)) {
    return false;
  }
  processingOrders.set(orderId, Date.now());
  return true;
}

/**
 * Release the lock after booking creation completes (success or failure).
 */
function releaseOrderLock(orderId) {
  processingOrders.delete(orderId);
}

/**
 * Auto-release stale locks every 15 seconds to prevent leaks on unhandled errors.
 */
setInterval(() => {
  const now = Date.now();
  for (const [orderId, lockedAt] of processingOrders.entries()) {
    if (now - lockedAt > 30000) { // 30 second timeout
      processingOrders.delete(orderId);
      console.log(`⚠️ orderLock: Auto-released stale lock for order ${orderId}`);
    }
  }
}, 15000);

module.exports = { acquireOrderLock, releaseOrderLock };
