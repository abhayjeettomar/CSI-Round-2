// server/engine/simulator.js
// Toggleable background crowd simulator for realistic live demo telemetry

import { state, persistState, formatDate, randomCode } from './store.js';
import { holdResource, reserveSlot, advanceStatus, checkInBooking } from './bookingEngine.js';
import { broadcast } from './sse.js';

let simInterval = null;

export function isCrowdSimActive() {
  return state.settings.crowdSim === true;
}

export function toggleCrowdSim(forceState = null) {
  const nextState = forceState !== null ? forceState : !state.settings.crowdSim;
  state.settings.crowdSim = nextState;
  persistState();

  if (nextState) {
    startSim();
  } else {
    stopSim();
  }

  broadcast('sim:toggle', { active: nextState });
  return nextState;
}

function startSim() {
  if (simInterval) return;
  console.log('[simulator] Crowd Simulator activated (3.5s interval)');

  simInterval = setInterval(async () => {
    try {
      await runSimStep();
    } catch (err) {
      // Simulator errors are silent to avoid spamming logs
    }
  }, 3500);
}

function stopSim() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
    console.log('[simulator] Crowd Simulator paused');
  }
}

async function runSimStep() {
  if (!state.settings.crowdSim) return;

  const now = Date.now();
  const students = state.users.filter(u => u.role === 'student');
  const randomStudent = students[Math.floor(Math.random() * students.length)];
  const today = formatDate();
  const currentHour = new Date().getHours();
  const actionType = Math.floor(Math.random() * 4);

  if (actionType === 0) {
    // 1. Random Library Hold/Booking
    const targetHour = (currentHour >= 8 && currentHour < 21) ? currentHour : 14;
    const freeTables = Object.values(state.slots).filter(s =>
      s.module === 'library' &&
      s.date === today &&
      s.startHour === targetHour &&
      s.capacity === 1 &&
      s.usedCapacity === 0
    );

    if (freeTables.length > 0) {
      const chosen = freeTables[Math.floor(Math.random() * freeTables.length)];
      // 50% hold, 50% instant book
      if (Math.random() > 0.5) {
        await holdResource({
          module: 'library',
          resourceId: chosen.resourceId,
          slotIds: [chosen.id],
          studentId: randomStudent.id,
          studentName: randomStudent.name,
          ttlMs: 45000 // 45s hold for rapid visual turnaround
        });
      } else {
        await reserveSlot({
          module: 'library',
          resourceId: chosen.resourceId,
          slotIds: [chosen.id],
          studentId: randomStudent.id,
          studentName: randomStudent.name,
          units: 1,
          meta: { seatName: state.resources[chosen.resourceId]?.name, simulated: true }
        });
      }
    }
  } else if (actionType === 1) {
    // 2. Advance a Laundry Stage
    const activeLaundry = Object.values(state.bookings).filter(b =>
      b.module === 'laundry' && b.status !== 'Collected' && b.status !== 'Cancelled'
    );
    if (activeLaundry.length > 0) {
      const order = activeLaundry[Math.floor(Math.random() * activeLaundry.length)];
      const flow = ['Dropped', 'Washing', 'Ironing', 'Ready', 'Collected'];
      const curIdx = flow.indexOf(order.status);
      if (curIdx >= 0 && curIdx < flow.length - 1) {
        const next = flow[curIdx + 1];
        await advanceStatus({ bookingId: order.id, nextStatus: next });
      }
    }
  } else if (actionType === 2) {
    // 3. Advance a Parcel Stage
    const activeParcels = Object.values(state.bookings).filter(b =>
      b.module === 'parcels' && b.status !== 'Collected'
    );
    if (activeParcels.length > 0) {
      const parcel = activeParcels[Math.floor(Math.random() * activeParcels.length)];
      const flow = ['Arrived', 'Ready at Gate', 'Collected'];
      const curIdx = flow.indexOf(parcel.status);
      if (curIdx >= 0 && curIdx < flow.length - 1) {
        const next = flow[curIdx + 1];
        await advanceStatus({ bookingId: parcel.id, nextStatus: next });
      }
    }
  } else {
    // 4. Check in an un-checked-in Library Seat
    const unCheckedLib = Object.values(state.bookings).filter(b =>
      b.module === 'library' && b.status === 'Booked'
    );
    if (unCheckedLib.length > 0) {
      const b = unCheckedLib[Math.floor(Math.random() * unCheckedLib.length)];
      await checkInBooking({ bookingId: b.id });
    }
  }
}
