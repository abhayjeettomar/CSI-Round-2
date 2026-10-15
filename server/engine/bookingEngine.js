// server/engine/bookingEngine.js
// Generic Resource, Slot, Hold, Booking engine + multi-module atomic transactions

import { withLock } from './lock.js';
import { state, persistState, randomCode, formatDate } from './store.js';
import { broadcast } from './sse.js';

const STUDENT_ENROLLMENT_REGEX = /^E\d{2}[A-Z]{3,4}\d{4}$/i;

/**
 * Get full state snapshot for client bootstrap or admin inspection
 */
export function getSnapshot() {
  return {
    resources: state.resources,
    slots: state.slots,
    holds: state.holds,
    bookings: state.bookings,
    users: state.users,
    settings: state.settings,
    serverTime: Date.now()
  };
}

/**
 * Filter slots by module and date
 */
export function getModuleSlots(moduleName, date) {
  const targetDate = date || formatDate();
  return Object.values(state.slots).filter(s => s.module === moduleName && s.date === targetDate);
}

/**
 * 1. ATOMIC HOLD: 90-Second Lock on a Resource Slot
 */
export async function holdResource({ module, resourceId, slotIds, studentId, studentName, ttlMs = 90000 }) {
  return withLock(async () => {
    const now = Date.now();

    // Verify slots exist and are free
    for (const slotId of slotIds) {
      const slot = state.slots[slotId];
      if (!slot) {
        const err = new Error(`Slot '${slotId}' does not exist.`);
        err.status = 404;
        throw err;
      }
      if (slot.usedCapacity >= slot.capacity) {
        const err = new Error(`Seat or slot ${slot.resourceId} is already fully booked.`);
        err.status = 409;
        throw err;
      }

      // Check if held by another student
      for (const h of Object.values(state.holds)) {
        if (h.slotIds.includes(slotId) && h.expiresAt > now && h.studentId !== studentId) {
          const remainingSec = Math.ceil((h.expiresAt - now) / 1000);
          const err = new Error(`Seat is currently held by another student (${remainingSec}s remaining).`);
          err.status = 409;
          throw err;
        }
      }
    }

    // Clear any previous holds by this student in this module
    for (const [hId, h] of Object.entries(state.holds)) {
      if (h.studentId === studentId && h.module === module) {
        delete state.holds[hId];
      }
    }

    const holdId = `H-${randomCode(4)}`;
    const expiresAt = now + ttlMs;
    const hold = {
      id: holdId,
      module,
      resourceId,
      slotIds,
      studentId,
      studentName: studentName || 'Bennett Student',
      createdAt: now,
      expiresAt
    };

    state.holds[holdId] = hold;
    persistState();

    broadcast('hold:created', hold);
    broadcast('state:patch', { holds: state.holds });

    return hold;
  });
}

/**
 * Release an active hold
 */
export async function releaseHold({ holdId, studentId }) {
  return withLock(async () => {
    const hold = state.holds[holdId];
    if (!hold) return { success: true };

    if (studentId && hold.studentId !== studentId) {
      const err = new Error('You do not own this hold.');
      err.status = 403;
      throw err;
    }

    delete state.holds[holdId];
    persistState();

    broadcast('hold:released', { holdId });
    broadcast('state:patch', { holds: state.holds });

    return { success: true, releasedId: holdId };
  });
}

/**
 * 2. ATOMIC RESERVE: Single Module Slot Reservation
 */
export async function reserveSlot({
  module,
  resourceId,
  slotIds,
  studentId,
  studentName,
  members = [],
  units = 1,
  meta = {},
  holdId = null,
  runId = null
}) {
  return withLock(async () => {
    const now = Date.now();
    const resource = state.resources[resourceId];
    if (!resource) {
      const err = new Error(`Resource '${resourceId}' not found.`);
      err.status = 404;
      throw err;
    }

    // Validate enrollment ID
    if (!studentId || !STUDENT_ENROLLMENT_REGEX.test(studentId)) {
      const err = new Error(`Invalid Bennett University enrollment number: '${studentId}'. Must match format E22CSEU0123.`);
      err.status = 400;
      throw err;
    }

    // --- MODULE SPECIFIC BUSINESS VALIDATIONS ---

    // 1. Library Rules
    if (module === 'library') {
      // Check group cubicle member requirements
      if (resource.type === 'cubicle') {
        const uniqueMembers = Array.from(new Set([studentId, ...members]));
        if (uniqueMembers.length < 2 || uniqueMembers.length > 4) {
          const err = new Error('Cubicles require 2 to 4 valid student enrollment numbers.');
          err.status = 400;
          throw err;
        }
        for (const m of uniqueMembers) {
          if (!STUDENT_ENROLLMENT_REGEX.test(m)) {
            const err = new Error(`Invalid member enrollment number: ${m}`);
            err.status = 400;
            throw err;
          }
        }
        units = uniqueMembers.length;
        members = uniqueMembers;
      }

      // Check max 3 consecutive hours in one booking
      if (slotIds.length > 3) {
        const err = new Error('Library study sessions are capped at 3 consecutive hours per booking.');
        err.status = 400;
        throw err;
      }

      // Check daily cap: max 4 hours total per day
      const targetDate = state.slots[slotIds[0]]?.date || formatDate();
      const studentDailyBookings = Object.values(state.bookings).filter(b => 
        b.module === 'library' &&
        b.studentId === studentId &&
        b.date === targetDate &&
        b.status !== 'Cancelled' &&
        b.status !== 'Auto-Released (No-Show)'
      );
      const bookedHoursToday = studentDailyBookings.reduce((sum, b) => sum + (b.endHour - b.startHour), 0);
      if (bookedHoursToday + slotIds.length > 4) {
        const err = new Error(`Daily Library limit exceeded. You have already booked ${bookedHoursToday}h today (Max 4h/day).`);
        err.status = 409;
        throw err;
      }
    }

    // 2. Laundry Rules
    if (module === 'laundry') {
      // Max 2 active orders
      const activeLaundryOrders = Object.values(state.bookings).filter(b =>
        b.module === 'laundry' &&
        b.studentId === studentId &&
        b.status !== 'Collected' &&
        b.status !== 'Cancelled'
      );
      if (activeLaundryOrders.length >= 2) {
        const err = new Error('Maximum limit reached: You already have 2 active laundry orders in progress.');
        err.status = 409;
        throw err;
      }

      // Bags 1-3
      const bags = Number(meta.bags || units || 1);
      if (bags < 1 || bags > 3) {
        const err = new Error('Laundry capacity policy: 1 to 3 bags per order.');
        err.status = 400;
        throw err;
      }
      units = bags;
    }

    // 3. Courts Rules
    if (module === 'courts') {
      const targetDate = state.slots[slotIds[0]]?.date || formatDate();
      const activeCourtsToday = Object.values(state.bookings).filter(b =>
        b.module === 'courts' &&
        b.studentId === studentId &&
        b.date === targetDate &&
        b.status !== 'Cancelled'
      );
      if (activeCourtsToday.length >= 1) {
        const err = new Error('Sports policy: Maximum 1 court/gym booking per student per day.');
        err.status = 409;
        throw err;
      }
    }

    // Verify slot capacity and holds
    const slotsToUpdate = [];
    for (const slotId of slotIds) {
      const slot = state.slots[slotId];
      if (!slot) {
        const err = new Error(`Slot '${slotId}' does not exist.`);
        err.status = 404;
        throw err;
      }
      if (slot.usedCapacity + units > slot.capacity) {
        const err = new Error(`Capacity exceeded for slot ${slot.startHour}:00 (${slot.capacity - slot.usedCapacity} remaining, requested ${units}).`);
        err.status = 409;
        throw err;
      }

      // If held by someone else, reject
      for (const h of Object.values(state.holds)) {
        if (h.slotIds.includes(slotId) && h.expiresAt > now && h.studentId !== studentId) {
          const err = new Error(`Slot is currently held by another student.`);
          err.status = 409;
          throw err;
        }
      }

      slotsToUpdate.push(slot);
    }

    // Consume hold if exists
    const consumedHoldIds = [];
    if (holdId && state.holds[holdId]) {
      delete state.holds[holdId];
      consumedHoldIds.push(holdId);
    }
    // Clear any hold in this module or on these slots owned by this student
    for (const [hId, h] of Object.entries(state.holds)) {
      if (h.studentId === studentId && (h.module === module || h.slotIds.some(sId => slotIds.includes(sId)))) {
        delete state.holds[hId];
        consumedHoldIds.push(hId);
      }
    }

    // Sort slots by start hour to determine window
    slotsToUpdate.sort((a, b) => a.startHour - b.startHour);
    const firstSlot = slotsToUpdate[0];
    const lastSlot = slotsToUpdate[slotsToUpdate.length - 1];

    // Increment usedCapacity atomically
    for (const slot of slotsToUpdate) {
      slot.usedCapacity += units;
    }

    // Determine initial status & tags
    let tagPrefix = 'BU-X';
    let initialStatus = 'Booked';
    let checkInDeadline = null;

    if (module === 'laundry') {
      tagPrefix = 'BU-L';
      initialStatus = 'Dropped';
    } else if (module === 'library') {
      tagPrefix = 'BU-LIB';
      initialStatus = 'Booked';
      // 10-minute check-in deadline
      const slotStartMs = new Date(`${firstSlot.date}T${String(firstSlot.startHour).padStart(2, '0')}:00:00`).getTime();
      const currentMs = Date.now();
      // If booking current hour or past, deadline is 10 mins from now; if upcoming, 10 mins after slot start
      checkInDeadline = Math.max(currentMs + 600000, slotStartMs + 600000);
    } else if (module === 'courts') {
      tagPrefix = 'BU-C';
      initialStatus = 'Booked';
    } else if (module === 'parcels') {
      tagPrefix = 'BU-P';
      initialStatus = 'Arrived';
    } else if (module === 'rooms') {
      tagPrefix = 'BU-R';
      initialStatus = resource.autoApprove ? 'Approved' : 'Pending Approval';
    }

    const bookingId = `BK-${Date.now().toString().slice(-4)}${randomCode(2)}`;
    const tag = `${tagPrefix}-${randomCode(4)}`;

    const booking = {
      id: bookingId,
      tag,
      runId,
      module,
      resourceId,
      slotIds,
      date: firstSlot.date,
      startHour: firstSlot.startHour,
      endHour: lastSlot.endHour,
      studentId,
      studentName: studentName || 'Bennett Student',
      members: members.length > 0 ? members : [studentId],
      units,
      status: initialStatus,
      statusHistory: [{ status: initialStatus, at: now }],
      checkInDeadline,
      meta,
      createdAt: now
    };

    state.bookings[bookingId] = booking;
    persistState();

    for (const hId of consumedHoldIds) {
      broadcast('hold:released', { holdId: hId, reason: 'confirmed' });
    }

    broadcast('booking:created', booking);
    broadcast('state:patch', {
      slots: state.slots,
      holds: state.holds
    });

    return booking;
  });
}

/**
 * 3. CAMPUS RUN: Multi-Module All-or-Nothing Atomic Execution
 */
export async function reserveMultiModuleAtomic({
  studentId,
  studentName,
  date,
  windowStart,
  windowEnd,
  legs
}) {
  return withLock(async () => {
    const now = Date.now();
    const runId = `RUN-${randomCode(4)}`;

    if (!Array.isArray(legs) || legs.length < 2) {
      const err = new Error('Campus Run requires at least 2 legs.');
      err.status = 400;
      throw err;
    }

    if (!studentId || !STUDENT_ENROLLMENT_REGEX.test(studentId)) {
      const err = new Error(`Invalid enrollment number: ${studentId}`);
      err.status = 400;
      throw err;
    }

    // Pre-validate all legs before mutating ANY state
    const validatedLegs = [];

    for (const leg of legs) {
      const { module, resourceId, slotIds, units = 1, meta = {} } = leg;
      const resource = state.resources[resourceId];
      if (!resource) {
        const err = new Error(`Resource '${resourceId}' for ${module} not found.`);
        err.status = 404;
        throw err;
      }

      // Check slot capacities & existing holds
      for (const slotId of slotIds) {
        const slot = state.slots[slotId];
        if (!slot) {
          const err = new Error(`Slot '${slotId}' does not exist.`);
          err.status = 404;
          throw err;
        }
        if (slot.usedCapacity + units > slot.capacity) {
          const err = new Error(`Capacity conflict in leg '${module}': slot at ${slot.startHour}:00 is full.`);
          err.status = 409;
          throw err;
        }
        for (const h of Object.values(state.holds)) {
          if (h.slotIds.includes(slotId) && h.expiresAt > now && h.studentId !== studentId) {
            const err = new Error(`Seat/slot in leg '${module}' is currently held by another student.`);
            err.status = 409;
            throw err;
          }
        }
      }

      // Module limits
      if (module === 'laundry') {
        const activeOrders = Object.values(state.bookings).filter(b =>
          b.module === 'laundry' && b.studentId === studentId && b.status !== 'Collected' && b.status !== 'Cancelled'
        );
        if (activeOrders.length >= 2) {
          const err = new Error('Campus Run failed: Max 2 active laundry orders limit reached.');
          err.status = 409;
          throw err;
        }
      }

      if (module === 'courts') {
        const targetDate = state.slots[slotIds[0]]?.date || date;
        const courtToday = Object.values(state.bookings).filter(b =>
          b.module === 'courts' && b.studentId === studentId && b.date === targetDate && b.status !== 'Cancelled'
        );
        if (courtToday.length >= 1) {
          const err = new Error('Campus Run failed: Max 1 court booking per student per day.');
          err.status = 409;
          throw err;
        }
      }

      validatedLegs.push({ leg, resource });
    }

    // ALL LEGS PASSED VALIDATION -> Commit all bookings atomically
    const createdBookings = [];

    for (const { leg, resource } of validatedLegs) {
      const { module, resourceId, slotIds, units = 1, meta = {} } = leg;
      const sortedSlots = slotIds.map(sId => state.slots[sId]).sort((a, b) => a.startHour - b.startHour);

      // Increment slot capacity
      for (const slot of sortedSlots) {
        slot.usedCapacity += units;
      }

      // Clear any hold
      for (const [hId, h] of Object.entries(state.holds)) {
        if (h.studentId === studentId && h.slotIds.some(sId => slotIds.includes(sId))) {
          delete state.holds[hId];
        }
      }

      let tagPrefix = 'BU-X';
      let initialStatus = 'Booked';
      let checkInDeadline = null;

      if (module === 'laundry') {
        tagPrefix = 'BU-L';
        initialStatus = 'Dropped';
      } else if (module === 'library') {
        tagPrefix = 'BU-LIB';
        initialStatus = 'Booked';
        checkInDeadline = now + 600000;
      } else if (module === 'courts') {
        tagPrefix = 'BU-C';
        initialStatus = 'Booked';
      } else if (module === 'parcels') {
        tagPrefix = 'BU-P';
        initialStatus = 'Arrived';
      } else if (module === 'rooms') {
        tagPrefix = 'BU-R';
        initialStatus = resource.autoApprove ? 'Approved' : 'Pending Approval';
      }

      const bookingId = `BK-${Date.now().toString().slice(-4)}${randomCode(2)}`;
      const tag = `${tagPrefix}-${randomCode(4)}`;

      const booking = {
        id: bookingId,
        tag,
        runId,
        module,
        resourceId,
        slotIds,
        date: sortedSlots[0].date,
        startHour: sortedSlots[0].startHour,
        endHour: sortedSlots[sortedSlots.length - 1].endHour,
        studentId,
        studentName: studentName || 'Bennett Student',
        members: [studentId],
        units,
        status: initialStatus,
        statusHistory: [{ status: initialStatus, at: now }],
        checkInDeadline,
        meta,
        createdAt: now
      };

      state.bookings[bookingId] = booking;
      createdBookings.push(booking);
    }

    persistState();

    broadcast('run:created', { runId, bookings: createdBookings });
    broadcast('state:patch', {
      slots: state.slots,
      holds: state.holds
    });

    return {
      runId,
      date,
      windowStart,
      windowEnd,
      bookings: createdBookings
    };
  });
}

/**
 * Cancel a booking and release capacity
 */
export async function cancelBooking({ bookingId, studentId, isStaff = false }) {
  return withLock(async () => {
    const booking = state.bookings[bookingId];
    if (!booking) {
      const err = new Error(`Booking '${bookingId}' not found.`);
      err.status = 404;
      throw err;
    }

    if (!isStaff && booking.studentId !== studentId && !booking.members.includes(studentId)) {
      const err = new Error('Unauthorized to cancel this booking.');
      err.status = 403;
      throw err;
    }

    if (booking.status === 'Cancelled' || booking.status === 'Collected') {
      const err = new Error(`Booking is already ${booking.status}.`);
      err.status = 400;
      throw err;
    }

    // Laundry cancellation rule: must be > 1 hour before drop slot start
    if (booking.module === 'laundry' && !isStaff) {
      const dropStartMs = new Date(`${booking.date}T${String(booking.startHour).padStart(2, '0')}:00:00`).getTime();
      const diffMs = dropStartMs - Date.now();
      if (diffMs < 3600000 && diffMs > 0) {
        const err = new Error('Laundry orders can only be cancelled up to 1 hour before the drop window starts.');
        err.status = 400;
        throw err;
      }
    }

    // Release capacity for all associated slots
    for (const slotId of booking.slotIds) {
      const slot = state.slots[slotId];
      if (slot) {
        slot.usedCapacity = Math.max(0, slot.usedCapacity - booking.units);
      }
    }

    booking.status = 'Cancelled';
    booking.statusHistory.push({ status: 'Cancelled', at: Date.now(), by: isStaff ? 'Staff' : 'Student' });
    booking.checkInDeadline = null;

    persistState();

    broadcast('booking:cancelled', { bookingId, booking });
    broadcast('state:patch', { slots: state.slots });

    return booking;
  });
}

/**
 * Check in to a booking
 */
export async function checkInBooking({ bookingId, tagOrStudentId }) {
  return withLock(async () => {
    let booking = state.bookings[bookingId];
    if (!booking && tagOrStudentId) {
      // Find by tag
      booking = Object.values(state.bookings).find(b => b.tag === tagOrStudentId);
    }

    if (!booking) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }

    const now = Date.now();
    let nextStatus = 'Checked-In';

    if (booking.module === 'parcels') {
      nextStatus = 'Collected';
    }

    booking.status = nextStatus;
    booking.statusHistory.push({ status: nextStatus, at: now });
    booking.checkInDeadline = null;

    persistState();

    broadcast('booking:checkedIn', { bookingId: booking.id, booking });
    broadcast('state:patch', { bookings: state.bookings });

    return booking;
  });
}

/**
 * Extend Library Booking +1 hour
 */
export async function extendLibraryBooking({ bookingId, studentId }) {
  return withLock(async () => {
    const booking = state.bookings[bookingId];
    if (!booking) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }

    if (booking.module !== 'library') {
      const err = new Error('Only library bookings can be extended.');
      err.status = 400;
      throw err;
    }

    if (booking.studentId !== studentId && !booking.members.includes(studentId)) {
      const err = new Error('Unauthorized.');
      err.status = 403;
      throw err;
    }

    const nextHour = booking.endHour;
    if (nextHour >= 22) {
      const err = new Error('Library closes at 22:00. Cannot extend further.');
      err.status = 400;
      throw err;
    }

    // Check daily cap
    const todayBookings = Object.values(state.bookings).filter(b =>
      b.module === 'library' &&
      b.studentId === studentId &&
      b.date === booking.date &&
      b.status !== 'Cancelled' &&
      b.status !== 'Auto-Released (No-Show)'
    );
    const bookedHoursToday = todayBookings.reduce((sum, b) => sum + (b.endHour - b.startHour), 0);
    if (bookedHoursToday + 1 > 4) {
      const err = new Error('Daily 4-hour Library cap reached. Cannot extend.');
      err.status = 409;
      throw err;
    }

    const nextSlotId = `library:${booking.resourceId}:${booking.date}:${nextHour}`;
    const nextSlot = state.slots[nextSlotId];
    if (!nextSlot || nextSlot.usedCapacity >= nextSlot.capacity) {
      const err = new Error(`Next hour (${nextHour}:00 - ${nextHour + 1}:00) on this seat is already booked by another student.`);
      err.status = 409;
      throw err;
    }

    // Check if next slot is held
    for (const h of Object.values(state.holds)) {
      if (h.slotIds.includes(nextSlotId) && h.expiresAt > Date.now()) {
        const err = new Error(`Next hour on this seat is currently held.`);
        err.status = 409;
        throw err;
      }
    }

    // Extend!
    nextSlot.usedCapacity += booking.units;
    booking.slotIds.push(nextSlotId);
    booking.endHour += 1;
    booking.statusHistory.push({ status: 'Extended +1Hr', at: Date.now() });

    persistState();

    broadcast('booking:extended', { bookingId: booking.id, booking });
    broadcast('state:patch', { slots: state.slots, bookings: state.bookings });

    return booking;
  });
}

/**
 * Advance status (for Staff Consoles)
 */
export async function advanceStatus({ bookingId, nextStatus }) {
  return withLock(async () => {
    const booking = state.bookings[bookingId];
    if (!booking) {
      const err = new Error(`Booking '${bookingId}' not found.`);
      err.status = 404;
      throw err;
    }

    const now = Date.now();
    booking.status = nextStatus;
    booking.statusHistory.push({ status: nextStatus, at: now });

    if (nextStatus === 'Collected' || nextStatus === 'Cancelled') {
      booking.checkInDeadline = null;
    }

    persistState();

    broadcast('booking:statusUpdated', { bookingId: booking.id, booking, nextStatus });
    broadcast('state:patch', { bookings: state.bookings });

    return booking;
  });
}

/**
 * Reap expired 90s holds and 10-minute ghost seats
 */
export async function reapExpiredHoldsAndGhostSeats() {
  return withLock(async () => {
    const now = Date.now();
    let freedHolds = 0;
    let freedGhostSeats = 0;

    // 1. Clear expired 90s holds
    for (const [holdId, hold] of Object.entries(state.holds)) {
      if (hold.expiresAt <= now) {
        delete state.holds[holdId];
        freedHolds++;
      }
    }

    // 2. Clear un-checked-in ghost seats past checkInDeadline
    for (const booking of Object.values(state.bookings)) {
      if (
        booking.module === 'library' &&
        booking.status === 'Booked' &&
        booking.checkInDeadline &&
        booking.checkInDeadline <= now
      ) {
        booking.status = 'Auto-Released (No-Show)';
        booking.statusHistory.push({ status: 'Auto-Released (No-Show)', at: now });
        booking.checkInDeadline = null;

        // Release slot capacity
        for (const slotId of booking.slotIds) {
          const slot = state.slots[slotId];
          if (slot) {
            slot.usedCapacity = Math.max(0, slot.usedCapacity - booking.units);
          }
        }
        freedGhostSeats++;
      }
    }

    if (freedHolds > 0 || freedGhostSeats > 0) {
      persistState();
      broadcast('reaper:run', { freedHolds, freedGhostSeats, timestamp: now });
      broadcast('state:patch', {
        slots: state.slots,
        holds: state.holds,
        bookings: state.bookings
      });
    }

    return { freedHolds, freedGhostSeats, timestamp: now };
  });
}

/**
 * Plan Campus Run: scans load across requested window and builds optimal itinerary
 */
export function planCampusRun({ date, windowStart, windowEnd, selectedTasks = ['laundry', 'library'] }) {
  const targetDate = date || formatDate();
  const startH = Number(windowStart) || 16;
  const endH = Number(windowEnd) || 19;

  const itinerary = [];

  // 1. Laundry drop: pick the least loaded 2h slot within [startH, endH]
  if (selectedTasks.includes('laundry')) {
    const laundrySlots = Object.values(state.slots).filter(s =>
      s.module === 'laundry' &&
      s.date === targetDate &&
      s.startHour >= startH &&
      s.startHour < endH
    );
    laundrySlots.sort((a, b) => (a.usedCapacity / a.capacity) - (b.usedCapacity / b.capacity));
    const bestLaundry = laundrySlots[0] || Object.values(state.slots).find(s => s.module === 'laundry' && s.date === targetDate);
    
    if (bestLaundry) {
      const loadPct = Math.round((bestLaundry.usedCapacity / bestLaundry.capacity) * 100);
      itinerary.push({
        module: 'laundry',
        title: 'Drop Laundry Bags',
        resourceId: bestLaundry.resourceId,
        resourceName: 'Central Laundry Depot',
        slotId: bestLaundry.id,
        startHour: bestLaundry.startHour,
        endHour: bestLaundry.endHour,
        date: targetDate,
        loadPct,
        loadLabel: loadPct < 40 ? 'Light Crowd' : loadPct < 75 ? 'Moderate' : 'Peak Traffic',
        description: `Drop off 1–3 laundry bags at Block C-Lower Ground. Turnaround: 24h.`
      });
    }
  }

  // 2. Library seat: pick a quiet available table
  if (selectedTasks.includes('library')) {
    const libStart = startH + (selectedTasks.includes('laundry') ? 1 : 0);
    const libEnd = Math.min(libStart + 1, endH);
    const libSlots = Object.values(state.slots).filter(s =>
      s.module === 'library' &&
      s.date === targetDate &&
      s.startHour === libStart &&
      s.capacity === 1 && // Solo table
      s.usedCapacity === 0
    );

    const bestLib = libSlots[0] || Object.values(state.slots).find(s => s.module === 'library' && s.date === targetDate && s.usedCapacity === 0);
    if (bestLib) {
      const resource = state.resources[bestLib.resourceId];
      itinerary.push({
        module: 'library',
        title: 'Study Session',
        resourceId: bestLib.resourceId,
        resourceName: resource ? resource.name : 'Study Table',
        slotId: bestLib.id,
        startHour: bestLib.startHour,
        endHour: bestLib.endHour,
        date: targetDate,
        loadPct: 35,
        loadLabel: 'Deep Focus (Quiet)',
        description: `Reserved seat with power socket in ${resource?.meta?.zone || 'East Wing'}.`
      });
    }
  }

  // 3. Optional Court / Gym or Parcel Pickup
  if (selectedTasks.includes('courts')) {
    const courtStart = Math.min(endH - 1, startH + 2);
    const courtSlots = Object.values(state.slots).filter(s =>
      s.module === 'courts' &&
      s.date === targetDate &&
      s.startHour === courtStart &&
      s.usedCapacity < s.capacity
    );
    const bestCourt = courtSlots[0];
    if (bestCourt) {
      const resource = state.resources[bestCourt.resourceId];
      const loadPct = Math.round((bestCourt.usedCapacity / bestCourt.capacity) * 100);
      itinerary.push({
        module: 'courts',
        title: resource ? resource.name : 'Sports Session',
        resourceId: bestCourt.resourceId,
        resourceName: resource ? resource.name : 'Court',
        slotId: bestCourt.id,
        startHour: bestCourt.startHour,
        endHour: bestCourt.endHour,
        date: targetDate,
        loadPct,
        loadLabel: loadPct < 50 ? 'Available' : 'Popular',
        description: `1-hour workout or match slot.`
      });
    }
  } else if (selectedTasks.includes('parcels')) {
    itinerary.push({
      module: 'parcels',
      title: 'Gate 2 Parcel Pickup',
      resourceId: 'PAR-GATE2',
      resourceName: 'Hostel Gate 2 Depot',
      slotId: `parcels:PAR-GATE2:${targetDate}:${startH}`,
      startHour: startH,
      endHour: startH + 1,
      date: targetDate,
      loadPct: 20,
      loadLabel: 'Quick Handover',
      description: 'Collect Amazon/BlueDart delivery on your way through Gate 2.'
    });
  }

  return {
    date: targetDate,
    windowStart: startH,
    windowEnd: endH,
    legs: itinerary,
    estimatedTotalMinutes: (endH - startH) * 60,
    crowdEfficiencyScore: 92
  };
}

/**
 * Get unified Student Campus Pass wallet
 */
export function getStudentWallet(studentId) {
  const activeBookings = Object.values(state.bookings).filter(b =>
    (b.studentId === studentId || b.members.includes(studentId)) &&
    b.status !== 'Cancelled' &&
    b.status !== 'Auto-Released (No-Show)'
  );

  const activeHolds = Object.values(state.holds).filter(h =>
    h.studentId === studentId && h.expiresAt > Date.now()
  );

  return {
    studentId,
    activeCount: activeBookings.length + activeHolds.length,
    bookings: activeBookings,
    holds: activeHolds,
    passCode: `PASS-${studentId}`
  };
}

/**
 * Hard delete booking (Admin/Database manager) and release slot capacity
 */
export async function deleteBookingAdmin({ bookingId }) {
  return withLock(async () => {
    const booking = state.bookings[bookingId];
    if (!booking) {
      const err = new Error(`Booking '${bookingId}' not found.`);
      err.status = 404;
      throw err;
    }

    // Release capacity if was not already cancelled
    if (booking.status !== 'Cancelled' && booking.status !== 'Auto-Released (No-Show)') {
      for (const slotId of booking.slotIds) {
        const slot = state.slots[slotId];
        if (slot) {
          slot.usedCapacity = Math.max(0, slot.usedCapacity - booking.units);
        }
      }
    }

    delete state.bookings[bookingId];
    persistState();

    broadcast('booking:deleted', { bookingId });
    broadcast('state:patch', { slots: state.slots, bookings: state.bookings });

    return { success: true, deletedId: bookingId };
  });
}

