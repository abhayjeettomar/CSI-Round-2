# BU PULSE — Bennett University Unified Campus Booking Platform

**BU PULSE** is an autonomous, real-time, atomic campus operations platform engineered specifically for **Bennett University, Greater Noida**. It unifies disparate campus facilities—hostel laundry turnaround, quiet library study carrels, athletic courts, hostel gate parcel sorting, and student club venues—into a single synchronized operating system with strict multi-user atomic consistency.

---

## 1. Quick Start (Single-Command Boot)

### Prerequisites
- Node.js `v18+` (Tested on Node.js `v24` with native fetch)
- npm `v9+`

### Installation & Launch
```bash
# 1. Install dependencies (Express, GSAP, Lenis, Fontsource typefaces)
npm install

# 2. Boot server (Express + SSE Stream + Offline Vendor Assets on port 3000)
npm start
```
The server will automatically generate fresh seed data on first boot in `data/db.json` and start listening on:
- **Application Web UI:** [http://localhost:3000](http://localhost:3000)
- **Live SSE Event Stream:** [http://localhost:3000/api/events](http://localhost:3000/api/events)
- **State Snapshot API:** [http://localhost:3000/api/state](http://localhost:3000/api/state)

---

## 2. Concurrency Proof (30x Mutex Race Test)

BU PULSE is built on a promise-based FIFO mutex (`server/engine/lock.js`) that serializes all state check-and-mutate operations in memory with atomic file write-through (`data/db.json`).

Run the automated race test script from the command line:
```bash
npm run test:race
# or directly:
node scripts/race-test.js
```

### Test Guarantee
The script launches **30 simultaneous asynchronous HTTP POST requests** competing for the exact same library desk and 1-hour slot:
```
======================================================
[RACE TEST] Launching 30 concurrent requests for 1 seat
Target: http://localhost:3000/api/debug/race-test
======================================================

Total Requests:                30
Successful Bookings (200/201): 1
Conflicts Rejected (409):      29
Elapsed Time:                  17ms
Winner: E22CSEU1001 | Booking Tag: BU-LIB-V47R

>>> RACE TEST PASS: 1 WON, 29 REJECTED (409) <<<
```
You can also trigger this live from the UI by clicking **"Proof It Works (30x Race Test)"** in the top utility bar!

---

## 3. Demo Personas & Fast Switcher (Simulated Campus Auth)

BU PULSE includes a simulated campus auth engine (`/^E\d{2}[A-Z]{3,4}\d{4}$/i`) and a persistent **1-Click Persona Switcher** in the top navigation bar:

| Persona | Role | Residence / Unit | Demo Scenario Focus |
|---|---|---|---|
| **Aarav Sharma (`E22CSEU0123`)** | Student (3rd Yr CSE) | Hostel C5, Room 402 | Active Laundry order (`BU-L-4F7K`), Library seat (`LIB-T05`), Campus Run (`RUN-9X4A`) |
| **Diya Verma (`E23CSEU0412`)** | Student (2nd Yr CSE) | Hostel C8, Room 214 | 4-Person Collaboration Cubicle (`LIB-C02`) & Ready Amazon parcel at Gate 2 |
| **Rohan Nair (`E24ECEU0108`)** | Student (1st Yr ECE) | Hostel D2, Room 105 | Badminton Court slot (`CRT-BD02`) & Robotics Bay workshop (`RM-CR102`) |
| **Ramesh Kumar (`STAFF-LAU`)** | Staff | Laundry Ops | One-tap stage advancement (`Dropped -> Washing -> Ironing -> Ready -> Collected`) |
| **Dr. Vandana Saxena (`STAFF-LIB`)** | Staff | Chief Librarian | Live seat check-in desk & manual 10-minute ghost seat reaper |
| **Balwan Singh (`STAFF-GATE`)** | Staff | Gate 2 Security | Inbound courier parcel logger & QR barcode checkout desk |

*You can also log in as any custom enrollment ID matching Bennett format (e.g., `E22CSEU0551`).*

---

## 4. Key Architectural Innovations

### P0 Core Modules
1. **Generic Booking Engine (`server/engine/bookingEngine.js`)**:
   - Single FIFO async mutex (`withLock()`) wraps all mutations.
   - 90-Second atomic seat holds (`holdResource()`) with live SSE countdown broadcast.
   - Automatic 10-minute no-show ghost seat reaper (`reaper.js` clears seats if un-checked-in after 10m).
   - Instant judge test button: *"Simulate 10m No-Show Expiry"* forces immediate seat release.
2. **Campus Run Planner & Atomic Multi-Module Execution (`/run`)**:
   - Multi-leg route optimizer scans slot load across a student's free window.
   - Pre-validates Laundry drop + Library seat + Court/Parcel slot.
   - Commits all legs inside a **single mutex lock acquisition** with an all-or-nothing guarantee (zero partial state on mid-click conflicts).
3. **Digital Campus Pass (`/pass`)**:
   - Pure client-side deterministic 21x21 SVG QR matrix generator (`QRPass.js`) with zero network overhead.
   - Unified wallet consolidating holds, runs, laundry wash tags, library seats, and gate parcels.
4. **Schematic SVG Floor Plan (`SeatMap.js`)**:
   - Custom architectural representation of Whispering Gallery (`T01–T12`), Quiet Reading Bay (`T13–T24`), and North Collaboration Cubicles (`C01–C08`).
   - Group cubicles enforce multi-student validation (2 to 4 valid enrollment numbers).
5. **Live Crowd Telemetry Simulator**:
   - Toggleable background crowd simulator in top bar (`POST /api/debug/crowd-sim`).
   - Generates realistic holds, bookings, and stage advances every 3.5s over SSE so the floor plan and gauges breathe live without needing multiple devices.

### P1 Integrated Modules
- **Sports Courts & Gym (`/courts`)**: Badminton BD01–BD04, Basketball Arena, Football Pitch, and Bennett Fitness Centre.
- **Hostel Gate 2 Parcels (`/parcels`)**: Real-time Amazon, BlueDart, Blinkit tracking with rack locations.
- **Club Rooms & Venues (`/rooms`)**: Weekly calendar grid with conflict detection and student affairs approval workflows.

---

## 5. Offline-Proof Runtime & Zero-CDN Architecture

All fonts, styling, and vendor animations are installed via npm and served from local `node_modules` mounted at `/vendor`:
- `@fontsource/instrument-serif` (Editorial Display serif)
- `@fontsource/plus-jakarta-sans` (Clean UI sans)
- `@fontsource/jetbrains-mono` (Technical metrics, tags, and timestamps)
- `gsap` & `ScrollTrigger` (Pinned 5-scene watch-case scroll story)
- `lenis` (Architectural smooth scrolling)

**Zero external CDNs** (`unpkg`, `jsdelivr`, or Google Fonts) are referenced anywhere in HTML or CSS.

---

## 6. How to Add a New Campus Service in 3 Simple Steps

To add a new service (e.g. `shuttle` or `mess`):
1. **Define Module Config & Rules (`server/modules/<name>.js`)**:
   Export `{ id, name, slotDurationHours, capacity, ...customRules }`.
2. **Register in Central Registry (`server/registry.js`)**:
   Import config and call `moduleRegistry.set('<name>', <name>Config)`. Routes for `/api/<name>/slots` and `/api/<name>/reserve` mount automatically.
3. **Build Frontend View (`public/modules/<name>/index.js`)**:
   Export `render<Name>(container)` using shared components (`SlotPicker.js`, `CapacityGauge.js`, `BookingCard.js`). Register the route in `public/app-shell/shell.js`.

---

## 7. Judge Showcase Checklist

- [x] **Single-Command Boot**: Express API + SSE stream + static frontend served on port `3000`.
- [x] **30x Race Test Passed**: Exactly 1 winner, 29 HTTP 409 rejections in 17ms.
- [x] **90-Second Atomic Hold**: Clicking any table locks it live with countdown across all connected screens.
- [x] **No Ghost Seats**: 10-minute check-in deadline with demo simulation button.
- [x] **Campus Run All-or-Nothing**: Multi-module planner locking Laundry + Library atomically under common `RUN-XXXX` ID.
- [x] **Zero External CDNs**: Offline fonts, GSAP, and Lenis served from `/vendor`.
- [x] **Pure SVG QR Matrix Generator**: Self-contained client-side 21x21 QR SVG without external APIs.
- [x] **Live Crowd Simulator**: Toggle button in top bar breathes live telemetry into gauges and floor plans.
- [x] **1-Click Persona Switcher**: Instant switching between Aarav Sharma, Diya Verma, Rohan Nair, and 3 staff roles.