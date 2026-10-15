// public/app-shell/sse.js
// EventSource client connecting to /api/events with auto-reconnect

import { store } from './store.js';
import { showToast } from '../components/Toast.js';

let evtSource = null;
let reconnectTimer = null;

export function connectSSE() {
  if (evtSource) {
    evtSource.close();
  }

  evtSource = new EventSource('/api/events');

  evtSource.onopen = () => {
    console.log('[SSE] Live stream connected to Bennett server');
    const dot = document.querySelector('.bu-live-dot');
    if (dot) dot.style.backgroundColor = 'var(--status-checked)';
  };

  evtSource.onerror = (err) => {
    console.warn('[SSE] Connection lost. Auto-reconnecting in 3s...', err);
    const dot = document.querySelector('.bu-live-dot');
    if (dot) dot.style.backgroundColor = 'var(--status-held)';
    evtSource.close();
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectSSE, 3000);
  };

  evtSource.addEventListener('connected', (e) => {
    console.log('[SSE] Handshake acknowledged:', e.data);
  });

  evtSource.addEventListener('state:patch', (e) => {
    try {
      const patch = JSON.parse(e.data);
      store.patch(patch);
    } catch (err) {
      console.error('[SSE parse error]:', err);
    }
  });

  evtSource.addEventListener('hold:created', (e) => {
    try {
      const hold = JSON.parse(e.data);
      store.state.holds[hold.id] = hold;
      store.notify();
    } catch {}
  });

  evtSource.addEventListener('hold:released', (e) => {
    try {
      const { holdId } = JSON.parse(e.data);
      delete store.state.holds[holdId];
      store.notify();
    } catch {}
  });

  evtSource.addEventListener('booking:created', (e) => {
    try {
      const booking = JSON.parse(e.data);
      store.state.bookings[booking.id] = booking;
      store.notify();
      const me = store.getCurrentUser();
      if (me && booking.studentId === me.id && !booking.meta?.testRun) {
        showToast(`Booking Confirmed: ${booking.tag}`, 'success');
      }
    } catch {}
  });

  evtSource.addEventListener('booking:cancelled', (e) => {
    try {
      const { bookingId, booking } = JSON.parse(e.data);
      if (booking) store.state.bookings[bookingId] = booking;
      store.notify();
    } catch {}
  });

  evtSource.addEventListener('booking:deleted', (e) => {
    try {
      const { bookingId } = JSON.parse(e.data);
      delete store.state.bookings[bookingId];
      store.notify();
    } catch {}
  });

  evtSource.addEventListener('booking:checkedIn', (e) => {
    try {
      const { bookingId, booking } = JSON.parse(e.data);
      if (booking) store.state.bookings[bookingId] = booking;
      store.notify();
    } catch {}
  });

  evtSource.addEventListener('booking:statusUpdated', (e) => {
    try {
      const { bookingId, booking } = JSON.parse(e.data);
      if (booking) store.state.bookings[bookingId] = booking;
      store.notify();
    } catch {}
  });

  evtSource.addEventListener('sim:toggle', (e) => {
    try {
      const { active } = JSON.parse(e.data);
      store.state.settings.crowdSim = active;
      const simBtn = document.querySelector('.bu-sim-pill');
      if (simBtn) {
        simBtn.classList.toggle('active', active);
        simBtn.innerHTML = `<span>Crowd Sim: <strong>${active ? 'LIVE ON' : 'PAUSED'}</strong></span>`;
      }
    } catch {}
  });
}
