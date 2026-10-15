// scripts/race-test.js
// Fires 30 concurrent requests for 1 seat; prints PASS only if 1 wins & 29 get 409

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function runRaceTest() {
  console.log(`\n======================================================`);
  console.log(`[RACE TEST] Launching 30 concurrent requests for 1 seat`);
  console.log(`Target: ${BASE_URL}/api/debug/race-test`);
  console.log(`======================================================\n`);

  try {
    const res = await fetch(`${BASE_URL}/api/debug/race-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await res.json();

    console.log(`Total Requests:                ${result.total}`);
    console.log(`Successful Bookings (200/201): ${result.succeeded}`);
    console.log(`Conflicts Rejected (409):      ${result.conflicted}`);
    console.log(`Elapsed Time:                  ${result.durationMs}ms`);

    if (result.pass) {
      console.log(`Winner: ${result.winnerId} | Booking Tag: ${result.winnerBookingTag || 'N/A'}`);
      console.log(`\n>>> RACE TEST PASS: 1 WON, 29 REJECTED (409) <<<\n`);
      process.exitCode = 0;
    } else {
      console.error(`\n>>> RACE TEST FAILED! Expected 1 win and 29 conflicts, got ${result.succeeded} wins and ${result.conflicted} conflicts. <<<\n`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('[RACE TEST CRITICAL ERROR]:', err.message);
    process.exitCode = 1;
  }
}

runRaceTest();
