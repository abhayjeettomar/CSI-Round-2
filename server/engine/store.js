// server/engine/store.js
// In-memory state store with atomic write-through to data/db.json & rich realistic seed generator

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory state container
export const state = {
  resources: {},
  slots: {},
  holds: {},
  bookings: {},
  users: [],
  settings: {
    crowdSim: false,
    initializedAt: Date.now()
  }
};

/**
 * Format Date to YYYY-MM-DD in local time
 */
export function formatDate(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate 8-day date list starting from today
 */
export function getUpcomingDates(count = 8) {
  const dates = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

/**
 * Generates an 4-character alphanumeric uppercase code
 */
export function randomCode(length = 4) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

/**
 * Atomic write-through persistence to data/db.json
 */
export function persistState() {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    const payload = JSON.stringify(state, null, 2);
    fs.writeFileSync(tempFile, payload, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[store] Error persisting state to db.json:', err);
  }
}

/**
 * Seed initial state if db.json is missing or invalid
 */
export function initStore() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.resources && parsed.slots) {
        state.resources = parsed.resources || {};
        state.slots = parsed.slots || {};
        state.holds = parsed.holds || {};
        state.bookings = parsed.bookings || {};
        state.users = parsed.users || [];
        state.settings = parsed.settings || { crowdSim: false, initializedAt: Date.now() };

        // Ensure dates are updated for today if stale
        const today = formatDate();
        const hasTodaySlots = Object.keys(state.slots).some(sId => sId.includes(today));
        if (hasTodaySlots) {
          console.log(`[store] Loaded existing state from ${DB_FILE} (${Object.keys(state.bookings).length} bookings, ${Object.keys(state.slots).length} slots)`);
          return;
        }
      }
    } catch (err) {
      console.warn('[store] Existing db.json could not be parsed, generating fresh seed data...');
    }
  }

  console.log('[store] Generating fresh Bennett University seed state...');
  generateSeedData();
  persistState();
}

export function resetSeedData() {
  console.log('[store] Resetting to fresh Bennett University seed state...');
  generateSeedData();
  persistState();
  return {
    success: true,
    resourcesCount: Object.keys(state.resources).length,
    slotsCount: Object.keys(state.slots).length,
    bookingsCount: Object.keys(state.bookings).length,
    holdsCount: Object.keys(state.holds).length
  };
}

export function generateSeedData() {
  const dates = getUpcomingDates(8);
  const today = dates[0];
  const now = Date.now();
  const currentHour = new Date().getHours();

  // 1. Realistic Bennett Students & Staff personas
  const studentsList = [
    { id: 'E22CSEU0123', name: 'Aarav Sharma', hostel: 'C5', room: '402', role: 'student', email: 'e22cseu0123@bennett.edu.in' },
    { id: 'E23CSEU0412', name: 'Diya Verma', hostel: 'C8', room: '214', role: 'student', email: 'e23cseu0412@bennett.edu.in' },
    { id: 'E24ECEU0108', name: 'Rohan Nair', hostel: 'D2', room: '105', role: 'student', email: 'e24eceu0108@bennett.edu.in' },
    { id: 'E22CSEU0045', name: 'Ananya Iyer', hostel: 'C4', room: '312', role: 'student', email: 'e22cseu0045@bennett.edu.in' },
    { id: 'E22MECH0054', name: 'Kabir Mehta', hostel: 'D4', room: '201', role: 'student', email: 'e22mech0054@bennett.edu.in' },
    { id: 'E23BBA0091', name: 'Sneha Patil', hostel: 'C6', room: '118', role: 'student', email: 'e23bba0091@bennett.edu.in' },
    { id: 'E21BTCH0033', name: 'Aditya Singh', hostel: 'D1', room: '407', role: 'student', email: 'e21btch0033@bennett.edu.in' },
    { id: 'E22CSEU0882', name: 'Tanvi Reddy', hostel: 'C7', room: '221', role: 'student', email: 'e22cseu0882@bennett.edu.in' },
    { id: 'E23ECEU0219', name: 'Ishaan Kapoor', hostel: 'D3', room: '304', role: 'student', email: 'e23eceu0219@bennett.edu.in' },
    { id: 'E24CSEU0014', name: 'Priya Sundaram', hostel: 'C3', room: '109', role: 'student', email: 'e24cseu0014@bennett.edu.in' },
    { id: 'E22CSEU0301', name: 'Siddharth Rao', hostel: 'D5', room: '315', role: 'student', email: 'e22cseu0301@bennett.edu.in' },
    { id: 'E23MECH0142', name: 'Meera Joshi', hostel: 'C9', room: '416', role: 'student', email: 'e23mech0142@bennett.edu.in' },
    { id: 'E24BBA0055', name: 'Arjun Deshmukh', hostel: 'D6', room: '112', role: 'student', email: 'e24bba0055@bennett.edu.in' },
    { id: 'E22ECEU0441', name: 'Riya Banerjee', hostel: 'C10', room: '203', role: 'student', email: 'e22eceu0441@bennett.edu.in' },
    { id: 'E23CSEU0911', name: 'Varun Chawla', hostel: 'D2', room: '409', role: 'student', email: 'e23cseu0911@bennett.edu.in' },
    { id: 'E21CSEU0078', name: 'Nandini Gupta', hostel: 'C2', room: '305', role: 'student', email: 'e21cseu0078@bennett.edu.in' },
    { id: 'E22BBA0102', name: 'Kunal Bhatia', hostel: 'D4', room: '107', role: 'student', email: 'e22bba0102@bennett.edu.in' },
    { id: 'E24CSEU0334', name: 'Tara Nambiar', hostel: 'C1', room: '202', role: 'student', email: 'e24cseu0334@bennett.edu.in' },
    { id: 'E23ECEU0512', name: 'Devendra Gill', hostel: 'D1', room: '310', role: 'student', email: 'e23eceu0512@bennett.edu.in' },
    { id: 'E22CSEU0671', name: 'Suhani Malhotra', hostel: 'C11', room: '401', role: 'student', email: 'e22cseu0671@bennett.edu.in' },
    { id: 'E23CSEU0115', name: 'Kartik Somani', hostel: 'D3', room: '211', role: 'student', email: 'e23cseu0115@bennett.edu.in' },
    { id: 'E24MECH0089', name: 'Avani Sengupta', hostel: 'C12', room: '108', role: 'student', email: 'e24mech0089@bennett.edu.in' },
    { id: 'E22BTCH0021', name: 'Pranav Kulkarni', hostel: 'D5', room: '403', role: 'student', email: 'e22btch0021@bennett.edu.in' },
    { id: 'E23CSEU0789', name: 'Kavya Pillai', hostel: 'C5', room: '302', role: 'student', email: 'e23cseu0789@bennett.edu.in' },
    { id: 'E24ECEU0404', name: 'Yash Vardhan', hostel: 'D6', room: '208', role: 'student', email: 'e24eceu0404@bennett.edu.in' },
    { id: 'E21CSEU0345', name: 'Bhavna Aggarwal', hostel: 'C7', room: '115', role: 'student', email: 'e21cseu0345@bennett.edu.in' },
    { id: 'E22BBA0211', name: 'Nikhil Saxena', hostel: 'D2', room: '318', role: 'student', email: 'e22bba0211@bennett.edu.in' },
    { id: 'E23MECH0076', name: 'Shreya Hegde', hostel: 'C4', room: '405', role: 'student', email: 'e23mech0076@bennett.edu.in' },
    { id: 'E24CSEU0519', name: 'Dhruv Trivedi', hostel: 'D4', room: '102', role: 'student', email: 'e24cseu0519@bennett.edu.in' },
    { id: 'E22ECEU0188', name: 'Pooja Bhatt', hostel: 'C8', room: '314', role: 'student', email: 'e22eceu0188@bennett.edu.in' },
    { id: 'E23CSEU0362', name: 'Chirag Goyal', hostel: 'D1', room: '219', role: 'student', email: 'e23cseu0362@bennett.edu.in' },
    { id: 'E24BBA0144', name: 'Deepika Sen', hostel: 'C6', room: '106', role: 'student', email: 'e24bba0144@bennett.edu.in' },
    { id: 'E21MECH0099', name: 'Harsh Vardhan', hostel: 'D3', room: '412', role: 'student', email: 'e21mech0099@bennett.edu.in' },
    { id: 'E22CSEU0551', name: 'Isha Kaushik', hostel: 'C3', room: '208', role: 'student', email: 'e22cseu0551@bennett.edu.in' },
    { id: 'E23BTCH0018', name: 'Gaurav Mishra', hostel: 'D5', room: '114', role: 'student', email: 'e23btch0018@bennett.edu.in' },
    { id: 'E24CSEU0227', name: 'Mallika Sethi', hostel: 'C10', room: '319', role: 'student', email: 'e24cseu0227@bennett.edu.in' },
    { id: 'E22ECEU0399', name: 'Akash Pandey', hostel: 'D2', room: '206', role: 'student', email: 'e22eceu0399@bennett.edu.in' },
    { id: 'E23BBA0088', name: 'Sonali Datta', hostel: 'C9', room: '103', role: 'student', email: 'e23bba0088@bennett.edu.in' },
    { id: 'E24MECH0112', name: 'Tejas Salunkhe', hostel: 'D4', room: '415', role: 'student', email: 'e24mech0112@bennett.edu.in' },
    { id: 'E21CSEU0419', name: 'Vidya Raman', hostel: 'C2', room: '212', role: 'student', email: 'e21cseu0419@bennett.edu.in' },
    { id: 'E22CSEU0922', name: 'Ojasvi Mathur', hostel: 'D6', room: '307', role: 'student', email: 'e22cseu0922@bennett.edu.in' },
    { id: 'E23ECEU0611', name: 'Samarth Jain', hostel: 'C11', room: '117', role: 'student', email: 'e23eceu0611@bennett.edu.in' }
  ];

  const staffList = [
    { id: 'STAFF-LAU', name: 'Ramesh Kumar (Laundry Ops)', role: 'staff', service: 'laundry', email: 'laundry.ops@bennett.edu.in' },
    { id: 'STAFF-LIB', name: 'Dr. Vandana Saxena (Library Desk)', role: 'staff', service: 'library', email: 'library.desk@bennett.edu.in' },
    { id: 'STAFF-GATE', name: 'Balwan Singh (Hostel Gate 2)', role: 'staff', service: 'parcels', email: 'gate2.security@bennett.edu.in' },
    { id: 'STAFF-ROOM', name: 'Prof. Arvind Menon (Student Affairs)', role: 'staff', service: 'rooms', email: 'student.affairs@bennett.edu.in' }
  ];

  state.users = [...studentsList, ...staffList];

  // 2. Resources definitions
  state.resources = {};

  // Library single-seat tables T01 to T24
  for (let i = 1; i <= 24; i++) {
    const num = String(i).padStart(2, '0');
    const id = `LIB-T${num}`;
    state.resources[id] = {
      id,
      module: 'library',
      name: `Table ${num}`,
      type: 'table',
      capacity: 1,
      meta: {
        zone: i <= 12 ? 'Whispering Gallery' : 'Quiet Reading Bay',
        wing: i <= 12 ? 'East Wing' : 'West Wing',
        hasPowerSocket: true
      }
    };
  }

  // Library 4-seat group cubicles C01 to C08
  for (let i = 1; i <= 8; i++) {
    const num = String(i).padStart(2, '0');
    const id = `LIB-C${num}`;
    state.resources[id] = {
      id,
      module: 'library',
      name: `Cubicle ${num}`,
      type: 'cubicle',
      capacity: 4,
      meta: {
        zone: 'Collaboration Cubicles',
        wing: 'North Wing',
        hasDisplay: true,
        whiteboard: true
      }
    };
  }

  // Laundry drop depot
  state.resources['LAU-DROP'] = {
    id: 'LAU-DROP',
    module: 'laundry',
    name: 'Central Laundry Depot',
    type: 'drop_station',
    capacity: 20,
    meta: {
      location: 'Block C-Lower Ground',
      turnaroundHours: { wash: 24, iron: 12, 'wash+iron': 36 }
    }
  };

  // Courts
  const courtDefs = [
    { id: 'CRT-BD01', name: 'Badminton Court 01', type: 'badminton', capacity: 4, meta: { surface: 'Synthetic Wood', indoor: true } },
    { id: 'CRT-BD02', name: 'Badminton Court 02', type: 'badminton', capacity: 4, meta: { surface: 'Synthetic Wood', indoor: true } },
    { id: 'CRT-BD03', name: 'Badminton Court 03', type: 'badminton', capacity: 4, meta: { surface: 'Synthetic Wood', indoor: true } },
    { id: 'CRT-BD04', name: 'Badminton Court 04', type: 'badminton', capacity: 4, meta: { surface: 'Synthetic Wood', indoor: true } },
    { id: 'CRT-BB01', name: 'Main Basketball Arena', type: 'basketball', capacity: 10, meta: { surface: 'Acrylic Turf', lights: true } },
    { id: 'CRT-FB01', name: 'Football Turf Pitch', type: 'football', capacity: 22, meta: { surface: 'FIFA Certified AstroTurf' } },
    { id: 'CRT-GYM01', name: 'Bennett Fitness Centre', type: 'gym', capacity: 25, meta: { equipment: 'Hammer Strength & Cardio' } }
  ];
  for (const c of courtDefs) {
    state.resources[c.id] = { ...c, module: 'courts' };
  }

  // Parcels
  state.resources['PAR-GATE2'] = {
    id: 'PAR-GATE2',
    module: 'parcels',
    name: 'Hostel Gate 2 Parcel Depot',
    type: 'parcel_depot',
    capacity: 150,
    meta: { location: 'Gate 2 Entrance Bay', racks: ['Rack A', 'Rack B', 'Rack C', 'Rack D'] }
  };

  // Club Rooms & Halls
  const roomDefs = [
    { id: 'RM-CR101', name: 'Coding Club Pod (CR-101)', type: 'club_room', capacity: 15, autoApprove: true, meta: { floor: '1st Floor Tech Wing', projector: true } },
    { id: 'RM-CR102', name: 'Robotics Bay (CR-102)', type: 'club_room', capacity: 20, autoApprove: true, meta: { floor: 'Ground Floor Innovation Hub', has3dPrinter: true } },
    { id: 'RM-SH201', name: 'Main Seminar Hall (SH-201)', type: 'seminar_hall', capacity: 150, autoApprove: false, meta: { floor: '2nd Floor Core Block', stageSound: true } },
    { id: 'RM-AMP01', name: 'Student Amphitheatre (AMP-01)', type: 'amphitheatre', capacity: 250, autoApprove: false, meta: { outdoor: true, acousticStage: true } }
  ];
  for (const r of roomDefs) {
    state.resources[r.id] = { ...r, module: 'rooms' };
  }

  // 3. Slots Generation across 8 days
  state.slots = {};

  dates.forEach((date, dayIdx) => {
    // Laundry: 2-hour blocks from 08:00 to 22:00 (08-10, 10-12, 12-14, 14-16, 16-18, 18-20, 20-22)
    const laundryWindows = [8, 10, 12, 14, 16, 18, 20];
    for (const startH of laundryWindows) {
      const slotId = `laundry:LAU-DROP:${date}:${startH}`;
      state.slots[slotId] = {
        id: slotId,
        module: 'laundry',
        resourceId: 'LAU-DROP',
        date,
        startHour: startH,
        endHour: startH + 2,
        capacity: 20,
        usedCapacity: 0
      };
    }

    // Library: 1-hour slots 08:00 to 22:00
    for (let h = 8; h < 22; h++) {
      // Tables T01-T24
      for (let i = 1; i <= 24; i++) {
        const resId = `LIB-T${String(i).padStart(2, '0')}`;
        const slotId = `library:${resId}:${date}:${h}`;
        state.slots[slotId] = {
          id: slotId,
          module: 'library',
          resourceId: resId,
          date,
          startHour: h,
          endHour: h + 1,
          capacity: 1,
          usedCapacity: 0
        };
      }
      // Cubicles C01-C08
      for (let i = 1; i <= 8; i++) {
        const resId = `LIB-C${String(i).padStart(2, '0')}`;
        const slotId = `library:${resId}:${date}:${h}`;
        state.slots[slotId] = {
          id: slotId,
          module: 'library',
          resourceId: resId,
          date,
          startHour: h,
          endHour: h + 1,
          capacity: 4,
          usedCapacity: 0
        };
      }
    }

    // Courts: 1-hour slots 08:00 to 22:00
    for (const c of courtDefs) {
      for (let h = 8; h < 22; h++) {
        const slotId = `courts:${c.id}:${date}:${h}`;
        state.slots[slotId] = {
          id: slotId,
          module: 'courts',
          resourceId: c.id,
          date,
          startHour: h,
          endHour: h + 1,
          capacity: c.capacity,
          usedCapacity: 0
        };
      }
    }

    // Rooms: 1-hour slots 08:00 to 22:00
    for (const r of roomDefs) {
      for (let h = 8; h < 22; h++) {
        const slotId = `rooms:${r.id}:${date}:${h}`;
        state.slots[slotId] = {
          id: slotId,
          module: 'rooms',
          resourceId: r.id,
          date,
          startHour: h,
          endHour: h + 1,
          capacity: 1, // Room reserved by 1 entity/booking
          usedCapacity: 0
        };
      }
    }

    // Parcels: 2-hour pickup windows 08:00 to 20:00
    const parcelWindows = [8, 10, 12, 14, 16, 18];
    for (const startH of parcelWindows) {
      const slotId = `parcels:PAR-GATE2:${date}:${startH}`;
      state.slots[slotId] = {
        id: slotId,
        module: 'parcels',
        resourceId: 'PAR-GATE2',
        date,
        startHour: startH,
        endHour: startH + 2,
        capacity: 150,
        usedCapacity: 0
      };
    }
  });

  // 4. Pre-seed ~65 realistic bookings/holds across today's slots
  state.bookings = {};
  state.holds = {};

  let bookingCounter = 1000;
  function makeBooking(payload) {
    bookingCounter++;
    const id = `BK-${bookingCounter}`;
    const booking = {
      id,
      tag: payload.tag || `BU-${payload.module.charAt(0).toUpperCase()}-${randomCode(4)}`,
      runId: payload.runId || null,
      module: payload.module,
      resourceId: payload.resourceId,
      slotIds: payload.slotIds,
      date: payload.date || today,
      startHour: payload.startHour,
      endHour: payload.endHour,
      studentId: payload.studentId,
      studentName: payload.studentName,
      members: payload.members || [payload.studentId],
      units: payload.units || 1,
      status: payload.status,
      statusHistory: payload.statusHistory || [{ status: payload.status, at: now - 3600000 }],
      checkInDeadline: payload.checkInDeadline || null,
      meta: payload.meta || {},
      createdAt: now - (payload.ageMinutes ? payload.ageMinutes * 60000 : 7200000)
    };

    state.bookings[id] = booking;

    // Increment usedCapacity for all slots
    for (const sId of payload.slotIds) {
      if (state.slots[sId]) {
        state.slots[sId].usedCapacity += booking.units;
      }
    }
    return booking;
  }

  // --- Seed Aarav Sharma (E22CSEU0123) with a Campus Run & active bookings ---
  const aaravRunId = 'RUN-9X4A';

  // 1. Aarav's Laundry Drop: today 16:00-18:00 (dropped, washing)
  makeBooking({
    module: 'laundry',
    resourceId: 'LAU-DROP',
    slotIds: [`laundry:LAU-DROP:${today}:16`],
    startHour: 16,
    endHour: 18,
    studentId: 'E22CSEU0123',
    studentName: 'Aarav Sharma',
    units: 2,
    tag: 'BU-L-4F7K',
    status: 'Washing',
    statusHistory: [
      { status: 'Dropped', at: now - 5400000 },
      { status: 'Washing', at: now - 1800000 }
    ],
    meta: {
      serviceType: 'Wash + Iron',
      bags: 2,
      items: 18,
      hostel: 'C5',
      room: '402',
      pickupSlotId: `laundry:LAU-DROP:${dates[2]}:10`
    },
    runId: aaravRunId
  });

  // 2. Aarav's Library Study Seat: today T05
  makeBooking({
    module: 'library',
    resourceId: 'LIB-T05',
    slotIds: [`library:LIB-T05:${today}:17`],
    startHour: 17,
    endHour: 18,
    studentId: 'E22CSEU0123',
    studentName: 'Aarav Sharma',
    units: 1,
    tag: 'BU-LIB-3M9P',
    status: 'Checked-In',
    checkInDeadline: null,
    statusHistory: [
      { status: 'Booked', at: now - 4000000 },
      { status: 'Checked-In', at: now - 2400000 }
    ],
    meta: { seatName: 'Table 05', zone: 'Whispering Gallery' },
    runId: aaravRunId
  });

  // 3. Aarav's Badminton Court: today 18:00
  makeBooking({
    module: 'courts',
    resourceId: 'CRT-BD02',
    slotIds: [`courts:CRT-BD02:${today}:18`],
    startHour: 18,
    endHour: 19,
    studentId: 'E22CSEU0123',
    studentName: 'Aarav Sharma',
    units: 2,
    tag: 'BU-C-8K21',
    status: 'Booked',
    meta: { sport: 'Badminton', courtName: 'Badminton Court 02' },
    runId: aaravRunId
  });

  // --- Seed Diya Verma (E23CSEU0412) ---
  makeBooking({
    module: 'library',
    resourceId: 'LIB-C02',
    slotIds: [`library:LIB-C02:${today}:15`],
    startHour: 15,
    endHour: 16,
    studentId: 'E23CSEU0412',
    studentName: 'Diya Verma',
    members: ['E23CSEU0412', 'E22CSEU0045', 'E23BBA0091'],
    units: 3,
    tag: 'BU-LIB-7C02',
    status: 'Checked-In',
    meta: { cubicleName: 'Cubicle 02', project: 'DBMS Mini Project Group 4' }
  });

  makeBooking({
    module: 'parcels',
    resourceId: 'PAR-GATE2',
    slotIds: [`parcels:PAR-GATE2:${today}:16`],
    startHour: 16,
    endHour: 18,
    studentId: 'E23CSEU0412',
    studentName: 'Diya Verma',
    units: 1,
    tag: 'BU-P-7K19',
    status: 'Ready at Gate',
    statusHistory: [
      { status: 'Arrived', at: now - 7200000 },
      { status: 'Ready at Gate', at: now - 3600000 }
    ],
    meta: {
      courier: 'Amazon',
      trackingNum: 'AMZ-IN-889021',
      bayRack: 'Gate 2 Rack B',
      category: 'Electronics'
    }
  });

  // --- Seed Rohan Nair (E24ECEU0108) ---
  makeBooking({
    module: 'courts',
    resourceId: 'CRT-GYM01',
    slotIds: [`courts:CRT-GYM01:${today}:19`],
    startHour: 19,
    endHour: 20,
    studentId: 'E24ECEU0108',
    studentName: 'Rohan Nair',
    units: 1,
    tag: 'BU-C-GYM4',
    status: 'Booked',
    meta: { sport: 'Gym Session', workout: 'Legs & Core' }
  });

  makeBooking({
    module: 'rooms',
    resourceId: 'RM-CR102',
    slotIds: [`rooms:RM-CR102:${today}:14`],
    startHour: 14,
    endHour: 16,
    studentId: 'E24ECEU0108',
    studentName: 'Rohan Nair',
    units: 1,
    tag: 'BU-R-9921',
    status: 'Approved',
    meta: { clubName: 'Robotics Club', purpose: 'RoboWars Chassis Assembly' }
  });

  // --- Seed ~12 more Laundry orders with varying statuses ---
  const sampleHostels = ['C1', 'C2', 'C4', 'C6', 'C7', 'D1', 'D2', 'D4'];
  const laundryStatuses = ['Dropped', 'Washing', 'Ironing', 'Ready', 'Collected'];
  for (let i = 4; i < 16; i++) {
    const student = studentsList[i];
    const dropHour = [8, 10, 12, 14, 16, 18][i % 6];
    const status = laundryStatuses[i % laundryStatuses.length];
    const bags = (i % 3) + 1;
    makeBooking({
      module: 'laundry',
      resourceId: 'LAU-DROP',
      slotIds: [`laundry:LAU-DROP:${today}:${dropHour}`],
      startHour: dropHour,
      endHour: dropHour + 2,
      studentId: student.id,
      studentName: student.name,
      units: bags,
      tag: `BU-L-${randomCode(4)}`,
      status,
      meta: {
        serviceType: ['Wash', 'Iron', 'Wash + Iron'][i % 3],
        bags,
        items: bags * 7,
        hostel: sampleHostels[i % sampleHostels.length],
        room: `${(i % 4) + 1}0${(i % 8) + 1}`,
        pickupSlotId: `laundry:LAU-DROP:${dates[1]}:12`
      }
    });
  }

  // --- Seed ~22 Library bookings across tables and cubicles ---
  const activeHours = [currentHour, (currentHour + 1) % 24, 14, 15, 16, 17, 18, 19, 20].filter(h => h >= 8 && h < 22);
  for (let i = 1; i <= 24; i++) {
    if (i % 2 === 0) { // Half tables booked
      const tableId = `LIB-T${String(i).padStart(2, '0')}`;
      const h = activeHours[i % activeHours.length];
      const student = studentsList[(i + 5) % studentsList.length];
      const isCheckedIn = i % 4 === 0;
      makeBooking({
        module: 'library',
        resourceId: tableId,
        slotIds: [`library:${tableId}:${today}:${h}`],
        startHour: h,
        endHour: h + 1,
        studentId: student.id,
        studentName: student.name,
        units: 1,
        tag: `BU-LIB-${randomCode(4)}`,
        status: isCheckedIn ? 'Checked-In' : 'Booked',
        checkInDeadline: isCheckedIn ? null : now + 600000,
        meta: { seatName: `Table ${String(i).padStart(2, '0')}`, zone: i <= 12 ? 'Whispering Gallery' : 'Quiet Reading Bay' }
      });
    }
  }

  // Cubicles bookings
  for (let c = 1; c <= 4; c++) {
    const cubicleId = `LIB-C0${c}`;
    const h = 16 + (c % 4);
    if (h < 22) {
      const student = studentsList[15 + c];
      makeBooking({
        module: 'library',
        resourceId: cubicleId,
        slotIds: [`library:${cubicleId}:${today}:${h}`],
        startHour: h,
        endHour: h + 1,
        studentId: student.id,
        studentName: student.name,
        members: [student.id, studentsList[20 + c].id],
        units: 2,
        tag: `BU-LIB-${randomCode(4)}`,
        status: 'Booked',
        checkInDeadline: now + 500000,
        meta: { cubicleName: `Cubicle 0${c}`, topic: 'Capstone Project Ideation' }
      });
    }
  }

  // Add 2 active 90-second holds for demo realism
  const holdTableId = 'LIB-T14';
  const holdSlotId = `library:${holdTableId}:${today}:${(currentHour + 1) >= 22 ? 10 : (currentHour + 1)}`;
  if (state.slots[holdSlotId] && state.slots[holdSlotId].usedCapacity === 0) {
    const holdStudent = studentsList[30];
    state.holds['H-DEMO-01'] = {
      id: 'H-DEMO-01',
      module: 'library',
      resourceId: holdTableId,
      slotIds: [holdSlotId],
      studentId: holdStudent.id,
      studentName: holdStudent.name,
      createdAt: now - 30000,
      expiresAt: now + 60000 // 60s remaining
    };
  }

  // --- Seed ~8 more Parcels ---
  const parcelCouriers = ['BlueDart', 'Delhivery', 'Amazon', 'Blinkit'];
  for (let p = 0; p < 8; p++) {
    const student = studentsList[p + 10];
    const status = p % 3 === 0 ? 'Collected' : p % 2 === 0 ? 'Ready at Gate' : 'Arrived';
    makeBooking({
      module: 'parcels',
      resourceId: 'PAR-GATE2',
      slotIds: [`parcels:PAR-GATE2:${today}:14`],
      startHour: 14,
      endHour: 16,
      studentId: student.id,
      studentName: student.name,
      units: 1,
      tag: `BU-P-${randomCode(4)}`,
      status,
      meta: {
        courier: parcelCouriers[p % parcelCouriers.length],
        trackingNum: `TRK-IN-${990000 + p * 37}`,
        bayRack: `Gate 2 Rack ${['A', 'B', 'C'][p % 3]}`,
        category: ['Books', 'Clothing', 'Snacks', 'Electronics'][p % 4]
      }
    });
  }

  // --- Seed ~6 Court bookings ---
  const courtsList = ['CRT-BD01', 'CRT-BD03', 'CRT-BB01', 'CRT-FB01', 'CRT-GYM01'];
  for (let k = 0; k < courtsList.length; k++) {
    const cId = courtsList[k];
    const student = studentsList[k + 20];
    makeBooking({
      module: 'courts',
      resourceId: cId,
      slotIds: [`courts:${cId}:${today}:17`],
      startHour: 17,
      endHour: 18,
      studentId: student.id,
      studentName: student.name,
      units: cId === 'CRT-GYM01' ? 8 : 4,
      tag: `BU-C-${randomCode(4)}`,
      status: 'Booked',
      meta: { sport: state.resources[cId].type }
    });
  }

  // --- Seed 3 Club Room bookings ---
  makeBooking({
    module: 'rooms',
    resourceId: 'RM-CR101',
    slotIds: [`rooms:RM-CR101:${today}:16`],
    startHour: 16,
    endHour: 18,
    studentId: 'E22CSEU0045',
    studentName: 'Ananya Iyer',
    units: 1,
    tag: 'BU-R-COD1',
    status: 'Approved',
    meta: { clubName: 'Google Developer Student Club', purpose: 'Flutter & Cloud Hands-on Lab' }
  });

  makeBooking({
    module: 'rooms',
    resourceId: 'RM-SH201',
    slotIds: [`rooms:RM-SH201:${dates[1]}:14`],
    startHour: 14,
    endHour: 17,
    studentId: 'E22CSEU0123',
    studentName: 'Aarav Sharma',
    units: 1,
    tag: 'BU-R-SEM1',
    status: 'Pending Approval',
    meta: { clubName: 'ACM Student Chapter', purpose: 'Bennett Tech Talks: Agentic AI Frontiers' }
  });

  console.log(`[store] Seeding complete! Generated ${Object.keys(state.resources).length} resources, ${Object.keys(state.slots).length} slots, ${Object.keys(state.bookings).length} bookings.`);
}
