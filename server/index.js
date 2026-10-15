// server/index.js
// Express application, static mounts (/ and /vendor), API routes, SSE endpoint

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { initStore, state, formatDate, resetSeedData, persistState } from './engine/store.js';
import { registerClient } from './engine/sse.js';
import { startReaper, forceReap } from './engine/reaper.js';
import { toggleCrowdSim, isCrowdSimActive } from './engine/simulator.js';
import {
  getSnapshot,
  getModuleSlots,
  holdResource,
  releaseHold,
  reserveSlot,
  reserveMultiModuleAtomic,
  cancelBooking,
  checkInBooking,
  extendLibraryBooking,
  advanceStatus,
  planCampusRun,
  getStudentWallet,
  deleteBookingAdmin
} from './engine/bookingEngine.js';
import { getModuleConfig, getAllModules } from './registry.js';
import { calculateEarliestPickup } from './modules/laundry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS & SSE headers helper
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 1. Mount /vendor to local node_modules (OFFLINE-PROOF RUNTIME)
app.use('/vendor', express.static(path.join(ROOT_DIR, 'node_modules'), {
  maxAge: '1d'
}));

// 2. Mount /campus to public/campus
app.use('/campus', express.static(path.join(ROOT_DIR, 'public', 'campus')));

// 3. Mount static frontend
app.use(express.static(path.join(ROOT_DIR, 'public')));

// --- SSE ENDPOINT ---
app.get('/api/events', (req, res) => {
  registerClient(req, res);
});

// --- STATE & METRICS ---
app.get('/api/state', (req, res) => {
  res.json(getSnapshot());
});

app.get('/api/modules', (req, res) => {
  res.json(getAllModules());
});

// --- MODULE SLOTS ---
app.get('/api/:module/slots', (req, res) => {
  const { module } = req.params;
  const date = req.query.date || formatDate();
  const slots = getModuleSlots(module, date);
  res.json(slots);
});

// --- 90-SECOND ATOMIC HOLD ---
app.post('/api/:module/hold', async (req, res, next) => {
  try {
    const { module } = req.params;
    const { resourceId, slotIds, studentId, studentName, ttlMs } = req.body;
    const hold = await holdResource({
      module,
      resourceId,
      slotIds,
      studentId,
      studentName,
      ttlMs
    });
    res.status(201).json(hold);
  } catch (err) {
    next(err);
  }
});

app.post('/api/:module/release-hold', async (req, res, next) => {
  try {
    const { holdId, studentId } = req.body;
    const result = await releaseHold({ holdId, studentId });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- ATOMIC RESERVE ---
app.post('/api/:module/reserve', async (req, res, next) => {
  try {
    const { module } = req.params;
    const { resourceId, slotIds, studentId, studentName, members, units, meta, holdId } = req.body;
    const booking = await reserveSlot({
      module,
      resourceId,
      slotIds,
      studentId,
      studentName,
      members,
      units,
      meta,
      holdId
    });
    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
});

// --- LAUNDRY SMART PICKUP SUGGESTION ---
app.post('/api/laundry/pickup-suggestion', (req, res) => {
  const { dropDate, dropEndHour, serviceType } = req.body;
  const suggestion = calculateEarliestPickup(dropDate || formatDate(), dropEndHour || 18, serviceType);
  res.json(suggestion);
});

// --- LIBRARY EXTEND ---
app.post('/api/library/extend', async (req, res, next) => {
  try {
    const { bookingId, studentId } = req.body;
    const booking = await extendLibraryBooking({ bookingId, studentId });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// --- CAMPUS RUN: OPTIMIZE & ATOMIC EXECUTION ---
app.post('/api/run/plan', (req, res) => {
  const { date, windowStart, windowEnd, selectedTasks } = req.body;
  const plan = planCampusRun({ date, windowStart, windowEnd, selectedTasks });
  res.json(plan);
});

app.post('/api/run/execute', async (req, res, next) => {
  try {
    const { studentId, studentName, date, windowStart, windowEnd, legs } = req.body;
    const result = await reserveMultiModuleAtomic({
      studentId,
      studentName,
      date,
      windowStart,
      windowEnd,
      legs
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// --- CAMPUS PASS & WALLET ---
app.get('/api/pass/:studentId', (req, res) => {
  const wallet = getStudentWallet(req.params.studentId);
  res.json(wallet);
});

app.post('/api/pass/scan', (req, res) => {
  const { codeOrEnrollment } = req.body;
  const clean = (codeOrEnrollment || '').trim().replace(/^PASS-/i, '');
  const wallet = getStudentWallet(clean);
  res.json(wallet);
});

// --- BOOKING MUTATIONS ---
app.post('/api/bookings/:id/cancel', async (req, res, next) => {
  try {
    const { studentId, isStaff } = req.body;
    const booking = await cancelBooking({
      bookingId: req.params.id,
      studentId,
      isStaff: Boolean(isStaff)
    });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

app.post('/api/bookings/:id/checkin', async (req, res, next) => {
  try {
    const { tagOrStudentId } = req.body;
    const booking = await checkInBooking({
      bookingId: req.params.id,
      tagOrStudentId
    });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

app.post('/api/bookings/:id/advance', async (req, res, next) => {
  try {
    const { nextStatus } = req.body;
    const booking = await advanceStatus({
      bookingId: req.params.id,
      nextStatus
    });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// --- DEMO / DEBUG TELEMETRY ENDPOINTS ---
app.post('/api/debug/crowd-sim', (req, res) => {
  const { enabled } = req.body;
  const active = toggleCrowdSim(enabled !== undefined ? Boolean(enabled) : null);
  res.json({ active, crowdSim: active });
});

app.delete('/api/bookings/:id', async (req, res, next) => {
  try {
    const result = await deleteBookingAdmin({ bookingId: req.params.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/debug/reset-seed', (req, res) => {
  const summary = resetSeedData();
  broadcast('state:patch', {
    slots: state.slots,
    holds: state.holds,
    bookings: state.bookings,
    isReset: true
  });
  res.json(summary);
});

app.post('/api/debug/clear-all', (req, res) => {
  state.bookings = {};
  state.holds = {};
  for (const s of Object.values(state.slots)) {
    s.usedCapacity = 0;
  }
  persistState();
  broadcast('state:patch', {
    slots: state.slots,
    holds: state.holds,
    bookings: state.bookings,
    isReset: true
  });
  res.json({ success: true, message: 'All bookings & holds cleared' });
});

// 30-concurrent requests race test endpoint for live UI drawer proof
app.post('/api/debug/race-test', async (req, res) => {
  const start = Date.now();
  const testSeatId = 'LIB-T24';
  const testDate = formatDate();
  const testHour = 21; // 21:00-22:00
  const testSlotId = `library:${testSeatId}:${testDate}:${testHour}`;

  // Ensure test slot is clean before race
  const slot = state.slots[testSlotId];
  if (slot) {
    slot.usedCapacity = 0;
  }
  // Remove any booking or hold on this slot
  for (const [bId, b] of Object.entries(state.bookings)) {
    if (b.slotIds.includes(testSlotId)) {
      delete state.bookings[bId];
    }
  }
  for (const [hId, h] of Object.entries(state.holds)) {
    if (h.slotIds.includes(testSlotId)) {
      delete state.holds[hId];
    }
  }

  const concurrency = 30;
  const promises = [];

  for (let i = 1; i <= concurrency; i++) {
    const studentId = `E22CSEU${String(1000 + i).padStart(4, '0')}`;
    const studentName = `Race Racer ${i}`;

    promises.push(
      reserveSlot({
        module: 'library',
        resourceId: testSeatId,
        slotIds: [testSlotId],
        studentId,
        studentName,
        units: 1,
        meta: { testRun: true }
      })
      .then(booking => ({ status: 201, booking, studentId }))
      .catch(err => ({ status: err.status || 409, message: err.message, studentId }))
    );
  }

  const results = await Promise.all(promises);
  const succeeded = results.filter(r => r.status === 200 || r.status === 201);
  const conflicted = results.filter(r => r.status === 409);
  const durationMs = Date.now() - start;

  const winner = succeeded[0];
  const pass = succeeded.length === 1 && conflicted.length === (concurrency - 1);

  res.json({
    total: concurrency,
    succeeded: succeeded.length,
    conflicted: conflicted.length,
    durationMs,
    winnerId: winner ? winner.studentId : null,
    winnerBookingTag: winner?.booking?.tag || null,
    pass,
    auditSummary: `RACE TEST AUDIT: ${succeeded.length} WON, ${conflicted.length} REJECTED (409) in ${durationMs}ms`
  });
});

// SPA fallback: any non-API route serves index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(ROOT_DIR, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    status
  });
});

// Boot server
initStore();
startReaper(5000);

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`   BU PULSE — Bennett University Campus Platform`);
  console.log(`   Listening at: http://localhost:${PORT}`);
  console.log(`   Static mounts: / (public), /vendor (node_modules)`);
  console.log(`   SSE Event stream: http://localhost:${PORT}/api/events`);
  console.log(`======================================================\n`);
});
