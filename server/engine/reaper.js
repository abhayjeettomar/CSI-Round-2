// server/engine/reaper.js
// 5-second interval clearing expired 90s holds & 10-min un-checked-in ghost seats

import { reapExpiredHoldsAndGhostSeats } from './bookingEngine.js';

let reaperInterval = null;

export function startReaper(intervalMs = 5000) {
  if (reaperInterval) return;
  reaperInterval = setInterval(async () => {
    try {
      await reapExpiredHoldsAndGhostSeats();
    } catch (err) {
      console.error('[reaper] Error running periodic reap:', err);
    }
  }, intervalMs);
  console.log(`[reaper] Active background cleaner running every ${intervalMs}ms`);
}

export function stopReaper() {
  if (reaperInterval) {
    clearInterval(reaperInterval);
    reaperInterval = null;
  }
}

export async function forceReap() {
  return await reapExpiredHoldsAndGhostSeats();
}
