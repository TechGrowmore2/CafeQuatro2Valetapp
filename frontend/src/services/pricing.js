/**
 * Utilities for calculating parked duration and tiered/flat parking fees.
 */

export const getParkedDurationInfo = (startTime, endTime = null) => {
  if (!startTime) {
    return { totalMinutes: 0, hours: 0, mins: 0, text: '0 mins' };
  }

  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  let text = '';
  if (hours > 0) {
    text = `${hours} hr${hours > 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  } else {
    text = `${mins} min${mins !== 1 ? 's' : ''}`;
  }

  return { totalMinutes, hours, mins, text };
};

export const calculateBookingCharge = (booking, totalMinutesOverride = undefined) => {
  if (!booking) return 250;

  // If already paid with a recorded amount, return that amount
  if (booking.paymentStatus === 'paid' && booking.payment?.amount) {
    return booking.payment.amount;
  }

  // Calculate elapsed time
  let minutes = totalMinutesOverride;
  if (minutes === undefined) {
    const startTime = booking.parking?.startTime || booking.createdAt;
    const endTime = booking.parking?.actualEndTime || (booking.status === 'completed' ? booking.updatedAt : null);
    minutes = getParkedDurationInfo(startTime, endTime).totalMinutes;
  }

  const hoursElapsed = minutes / 60;

  // Determine venue tiers or fallback to Cafe Quattro Babulnath standard tiers (0-2h: 250, 2+h: 350)
  const venue = booking.driver?.venue || booking.venue;
  const pricingMode = venue?.pricingMode || 'tiered';
  const tiers = venue?.pricingTiers && venue.pricingTiers.length > 0
    ? venue.pricingTiers
    : [
        { maxHours: 2, charge: 250, label: '0–2 hrs' },
        { maxHours: null, charge: 350, label: '2+ hrs' }
      ];

  if (pricingMode === 'tiered' && tiers.length > 0) {
    const sorted = [...tiers].sort((a, b) => {
      if (a.maxHours === null) return 1;
      if (b.maxHours === null) return -1;
      return a.maxHours - b.maxHours;
    });

    for (const tier of sorted) {
      if (tier.maxHours !== null && hoursElapsed <= tier.maxHours) {
        return tier.charge;
      }
    }

    const openTier = sorted.find(t => t.maxHours === null);
    if (openTier) return openTier.charge;
    return sorted[sorted.length - 1]?.charge || 350;
  }

  // Flat pricing
  return booking.payment?.amount || venue?.parkingFee || 250;
};
