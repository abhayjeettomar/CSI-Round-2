// scripts/test-all-flows.js
// Automated verification of all user flows, bug fixes, and database operations

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('>>> STARTING COMPREHENSIVE E2E VERIFICATION <<<\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Verify Landing Page has NO spinning drum/gear
  try {
    const res = await fetch(`${BASE_URL}/landing/landing.js`);
    const code = await res.text();
    assert(!code.includes('story-drum-svg'), 'Landing page JS has ZERO story-drum-svg spinning gear');
    assert(!code.includes('rotation: 720'), 'Landing page JS has ZERO rotation GSAP animation');
    assert(code.includes('bu-telemetry-board'), 'Landing page JS has clean telemetry board');
  } catch (err) {
    assert(false, `Landing page check failed: ${err.message}`);
  }

  // 2. Verify Index HTML has Database link
  try {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    assert(html.includes('href="#/database"'), 'Navigation includes Live DB link');
    assert(html.includes('app-viewport'), 'Viewport mounted');
  } catch (err) {
    assert(false, `Index HTML check failed: ${err.message}`);
  }

  // 3. Verify Initial State API
  let state;
  try {
    const res = await fetch(`${BASE_URL}/api/state`);
    state = await res.json();
    assert(res.ok && state.resources && state.slots && state.bookings, 'GET /api/state returns complete state tree');
    assert(Object.keys(state.bookings).length > 20, `State contains ${Object.keys(state.bookings).length} initial bookings`);
  } catch (err) {
    assert(false, `State API failed: ${err.message}`);
  }

  // 4. Test 90-Second Hold & Confirmation Flow (The bug reported by user)
  let holdId;
  let testBooking;
  const testStudentId = 'E22CSEU9999';
  const testSeatId = 'LIB-T03';
  const testDate = new Date().toISOString().split('T')[0];
  const testSlotId = `library:${testSeatId}:${testDate}:16`;

  try {
    // A) Create Hold
    const holdRes = await fetch(`${BASE_URL}/api/library/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceId: testSeatId,
        slotIds: [testSlotId],
        studentId: testStudentId,
        studentName: 'Aarav Sharma',
        ttlMs: 90000
      })
    });
    const holdData = await holdRes.json();
    assert(holdRes.ok && holdData.id, `Seat hold created successfully (Hold ID: ${holdData.id})`);
    holdId = holdData.id;

    // Verify hold exists in state
    const stateWithHold = await (await fetch(`${BASE_URL}/api/state`)).json();
    assert(Boolean(stateWithHold.holds[holdId]), 'Hold is registered in server state.holds');

    // B) Confirm Seat using Hold
    const reserveRes = await fetch(`${BASE_URL}/api/library/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceId: testSeatId,
        slotIds: [testSlotId],
        studentId: testStudentId,
        studentName: 'Aarav Sharma',
        holdId: holdId,
        units: 1,
        meta: { seatName: 'Table 03' }
      })
    });
    testBooking = await reserveRes.json();
    assert(reserveRes.ok && testBooking.id && testBooking.tag, `Hold confirmed into Booking Tag: ${testBooking.tag}`);

    // C) Verify Hold is COMPLETELY PURGED from server holds (No lingering banner!)
    const stateAfterConfirm = await (await fetch(`${BASE_URL}/api/state`)).json();
    assert(!stateAfterConfirm.holds[holdId], 'Hold is completely removed from state.holds after confirmation');
    assert(Boolean(stateAfterConfirm.bookings[testBooking.id]), 'New confirmed booking is saved in state.bookings');
  } catch (err) {
    assert(false, `Hold & Confirm flow failed: ${err.message}`);
  }

  // 5. Test Check-In Action
  if (testBooking) {
    try {
      const checkinRes = await fetch(`${BASE_URL}/api/bookings/${testBooking.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const checkinData = await checkinRes.json();
      assert(checkinRes.ok && checkinData.status === 'Checked-In', `Check-In button works (status: ${checkinData.status})`);
    } catch (err) {
      assert(false, `Check-in failed: ${err.message}`);
    }
  }

  // 6. Test Extend Session (+1 Hr)
  if (testBooking) {
    try {
      const extendRes = await fetch(`${BASE_URL}/api/library/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: testBooking.id, studentId: testStudentId })
      });
      const extendData = await extendRes.json();
      assert(extendRes.ok && extendData.endHour === testBooking.endHour + 1, `Extend +1 Hr works (new endHour: ${extendData.endHour}:00)`);
    } catch (err) {
      assert(false, `Extend failed: ${err.message}`);
    }
  }

  // 7. Test Laundry Order & 5-Stage Status Progression
  let laundryBooking;
  try {
    const laundrySlotId = `laundry:LAU-DROP:${testDate}:10`;
    const lauRes = await fetch(`${BASE_URL}/api/laundry/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceId: 'LAU-DROP',
        slotIds: [laundrySlotId],
        studentId: testStudentId,
        studentName: 'Aarav Sharma',
        units: 2,
        meta: {
          serviceType: 'Standard Wash',
          bags: 2,
          items: 14,
          hostel: 'C5',
          room: '402'
        }
      })
    });
    laundryBooking = await lauRes.json();
    assert(lauRes.ok && laundryBooking.status === 'Dropped', `Laundry drop reserved (Tag: ${laundryBooking.tag})`);

    // Advance to 'Washing'
    const advRes = await fetch(`${BASE_URL}/api/bookings/${laundryBooking.id}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextStatus: 'Washing' })
    });
    const advData = await advRes.json();
    assert(advRes.ok && advData.status === 'Washing', 'Laundry status advanced to Washing');
  } catch (err) {
    assert(false, `Laundry flow failed: ${err.message}`);
  }

  // 8. Test Campus Run Atomic Multi-Leg Execution
  try {
    const runRes = await fetch(`${BASE_URL}/api/run/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: testStudentId,
        studentName: 'Aarav Sharma',
        date: testDate,
        windowStart: 18,
        windowEnd: 21,
        legs: [
          {
            module: 'courts',
            resourceId: 'CRT-BD02',
            slotIds: [`courts:CRT-BD02:${testDate}:18`],
            units: 2,
            meta: { sport: 'Badminton', courtName: 'Badminton Court 02' }
          },
          {
            module: 'library',
            resourceId: 'LIB-T10',
            slotIds: [`library:LIB-T10:${testDate}:19`],
            units: 1,
            meta: { seatName: 'Table 10' }
          }
        ]
      })
    });
    const runData = await runRes.json();
    assert(runRes.ok && runData.runId && runData.bookings.length === 2, `Campus Run locked atomically (Run ID: ${runData.runId}, 2 legs)`);
  } catch (err) {
    assert(false, `Campus run failed: ${err.message}`);
  }

  // 9. Test Database Delete Booking (Purge)
  if (testBooking) {
    try {
      const delRes = await fetch(`${BASE_URL}/api/bookings/${testBooking.id}`, {
        method: 'DELETE'
      });
      const delData = await delRes.json();
      assert(delRes.ok && delData.success, `Database delete booking endpoint works for ${testBooking.id}`);
    } catch (err) {
      assert(false, `Database delete failed: ${err.message}`);
    }
  }

  // 10. Test Concurrency Race Test (30 simultaneous requests for 1 seat)
  try {
    const raceRes = await fetch(`${BASE_URL}/api/debug/race-test`, {
      method: 'POST'
    });
    const raceData = await raceRes.json();
    assert(raceData.pass && raceData.succeeded === 1 && raceData.conflicted === 29, `30x Mutex Concurrency Test: 1 WINNER, 29 CONFLICTS in ${raceData.durationMs}ms`);
  } catch (err) {
    assert(false, `Race test failed: ${err.message}`);
  }

  console.log(`\n======================================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
