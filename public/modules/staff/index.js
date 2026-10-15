// public/modules/staff/index.js
// Unified tabbed staff consoles with 1-tap status progression & QR pass scanner

import { store, formatDate } from '../../app-shell/store.js';
import { renderEmptyState } from '../../components/EmptyState.js';
import { showToast } from '../../components/Toast.js';

let activeTab = 'laundry';
let scannedWallet = null;

export async function renderStaff(container, path = '/staff') {
  if (!document.getElementById('staff-css')) {
    const link = document.createElement('link');
    link.id = 'staff-css';
    link.rel = 'stylesheet';
    link.href = '/modules/staff/styles.css';
    document.head.appendChild(link);
  }

  // Handle path sub-routes like /staff/library
  const sub = path.replace('/staff', '').replace('/', '');
  if (['laundry', 'library', 'parcels', 'rooms'].includes(sub)) {
    activeTab = sub;
  }

  function updateView() {
    const today = formatDate();
    const allBookings = Object.values(store.state.bookings);

    // Filter by module
    const laundryQueue = allBookings.filter(b => b.module === 'laundry' && b.status !== 'Cancelled')
      .sort((a, b) => b.createdAt - a.createdAt);

    const libraryQueue = allBookings.filter(b => b.module === 'library' && b.date === today && b.status !== 'Cancelled')
      .sort((a, b) => a.startHour - b.startHour);

    const parcelQueue = allBookings.filter(b => b.module === 'parcels' && b.status !== 'Cancelled')
      .sort((a, b) => b.createdAt - a.createdAt);

    const roomsQueue = allBookings.filter(b => b.module === 'rooms' && b.status !== 'Cancelled')
      .sort((a, b) => a.date.localeCompare(b.date));

    container.innerHTML = `
      <div class="bu-container">
        <header class="bu-page-header">
          <span class="bu-page-eyebrow">CAMPUS OPERATIONS // STAFF &amp; SECURITY PORTAL</span>
          <h1 class="bu-page-title">Operator Consoles</h1>
          <p class="bu-page-subtitle">
            One-tap stage advancement, student QR pass verification, and gate parcel logging.
            State changes sync across connected student screens in &lt;1s via SSE.
          </p>
        </header>

        <!-- Scanner / Quick Lookup Strip -->
        <div class="bu-scanner-strip">
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; text-transform: uppercase;">
            Student Pass Scanner / Rapid Desk Check-In
          </div>

          <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
            <input 
              type="text" 
              id="staff-scan-input" 
              class="bu-form-control" 
              placeholder="Paste Pass Code or Enrollment ID (e.g. PASS-E22CSEU0123)"
              style="background: #FFFFFF;"
            />
            <button class="bu-btn bu-btn-primary" onclick="window.onStaffLookupPass()">
              Scan / Lookup
            </button>
          </div>

          <!-- Nearby Demo Passes Quick Chips -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.75rem;">
            <span style="color: var(--text-muted); font-family: var(--font-mono);">Nearby Demo Passes:</span>
            <button class="bu-badge" onclick="window.onStaffQuickChip('E22CSEU0123')">Aarav Sharma (E22CSEU0123)</button>
            <button class="bu-badge" onclick="window.onStaffQuickChip('E23CSEU0412')">Diya Verma (E23CSEU0412)</button>
            <button class="bu-badge" onclick="window.onStaffQuickChip('E24ECEU0108')">Rohan Nair (E24ECEU0108)</button>
          </div>

          <!-- Scanned Student Result -->
          ${scannedWallet ? `
            <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-card); border: 1.5px solid var(--accent); border-radius: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                <div style="font-weight: 700; font-size: 1.05rem;">
                  ${scannedWallet.studentId} &bull; ${scannedWallet.activeCount} Active Reservations
                </div>
                <button class="bu-btn bu-btn-outline bu-btn-sm" onclick="window.onClearScannedWallet()">Clear</button>
              </div>

              ${scannedWallet.bookings.length === 0 ? '<div style="font-size:0.85rem; color:var(--text-muted);">No active bookings for this student.</div>' : `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  ${scannedWallet.bookings.map(b => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-surface); border-radius: 3px;">
                      <div>
                        <strong>[${b.tag}]</strong> ${b.module.toUpperCase()} &bull; ${b.resourceId} (${b.status})
                      </div>
                      ${b.status !== 'Checked-In' && b.status !== 'Collected' ? `
                        <button class="bu-btn bu-btn-primary bu-btn-sm" onclick="window.onCheckInBooking('${b.id}')">
                          Tap Check-In
                        </button>
                      ` : '<span style="color:var(--status-checked); font-weight:600; font-size:0.75rem;">CHECKED-IN</span>'}
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          ` : ''}
        </div>

        <!-- Tab Selector -->
        <div class="bu-staff-tabs">
          <div class="bu-staff-tab ${activeTab === 'laundry' ? 'active' : ''}" onclick="window.onStaffTabChange('laundry')">
            Central Laundry (${laundryQueue.filter(b => b.status !== 'Collected').length} Active)
          </div>
          <div class="bu-staff-tab ${activeTab === 'library' ? 'active' : ''}" onclick="window.onStaffTabChange('library')">
            Library Desk (${libraryQueue.length} Sessions)
          </div>
          <div class="bu-staff-tab ${activeTab === 'parcels' ? 'active' : ''}" onclick="window.onStaffTabChange('parcels')">
            Gate 2 Parcels (${parcelQueue.filter(b => b.status !== 'Collected').length} Waiting)
          </div>
          <div class="bu-staff-tab ${activeTab === 'rooms' ? 'active' : ''}" onclick="window.onStaffTabChange('rooms')">
            Club Room Approvals (${roomsQueue.filter(b => b.status === 'Pending Approval').length} Pending)
          </div>
        </div>

        <!-- Tab 1: LAUNDRY CONSOLE -->
        ${activeTab === 'laundry' ? `
          <div class="bu-card">
            <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 1rem;">
              Laundry Washing &amp; Pressing Queue
            </h3>
            <div style="overflow-x: auto;">
              <table class="bu-table">
                <thead>
                  <tr>
                    <th>Wash Tag</th>
                    <th>Student</th>
                    <th>Service &amp; Bags</th>
                    <th>Hostel</th>
                    <th>Stage</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${laundryQueue.map(order => {
                    const stages = ['Dropped', 'Washing', 'Ironing', 'Ready', 'Collected'];
                    const curIdx = stages.indexOf(order.status);
                    const nextStage = curIdx >= 0 && curIdx < stages.length - 1 ? stages[curIdx + 1] : null;

                    return `
                      <tr>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${order.tag}</td>
                        <td>${order.studentName} <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted);">${order.studentId}</div></td>
                        <td>${order.meta?.serviceType} &bull; ${order.units} Bags</td>
                        <td>${order.meta?.hostel}-${order.meta?.room}</td>
                        <td><span class="bu-badge ${order.status === 'Ready' || order.status === 'Collected' ? 'bu-badge-checked' : 'bu-badge-held'}">${order.status}</span></td>
                        <td>
                          ${nextStage ? `
                            <button class="bu-btn bu-btn-primary bu-btn-sm" onclick="window.onAdvanceStage('${order.id}', '${nextStage}')">
                              Advance to ${nextStage} &rarr;
                            </button>
                          ` : '<span style="color:var(--text-muted); font-size:0.75rem;">Done</span>'}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- Tab 2: LIBRARY DESK -->
        ${activeTab === 'library' ? `
          <div class="bu-card">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;">
              <h3 style="font-family: var(--font-display); font-size: 1.6rem;">
                Today's Library Reading Sessions
              </h3>
              <button class="bu-btn bu-btn-sm" style="background:#FEF3C7; color:#92400E; border:1px solid #D97706;" onclick="window.onReapGhostsStaff()">
                Run Ghost Seat Cleaner
              </button>
            </div>
            <div style="overflow-x: auto;">
              <table class="bu-table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Seat ID</th>
                    <th>Hour</th>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Desk Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${libraryQueue.map(b => `
                    <tr>
                      <td style="font-family: var(--font-mono); font-weight: 700;">${b.tag}</td>
                      <td><strong>${b.resourceId}</strong> ${b.meta?.seatName ? `(${b.meta.seatName})` : ''}</td>
                      <td style="font-family: var(--font-mono);">${b.startHour}:00 &ndash; ${b.endHour}:00</td>
                      <td>${b.studentName} (${b.studentId})</td>
                      <td><span class="bu-badge ${b.status === 'Checked-In' ? 'bu-badge-checked' : 'bu-badge-booked'}">${b.status}</span></td>
                      <td>
                        ${b.status === 'Booked' ? `
                          <button class="bu-btn bu-btn-primary bu-btn-sm" onclick="window.onCheckInBooking('${b.id}')">
                            Check In Student
                          </button>
                        ` : '<span style="color:var(--status-checked); font-weight:600; font-size:0.75rem;">Active</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- Tab 3: GATE 2 PARCELS -->
        ${activeTab === 'parcels' ? `
          <div class="bu-grid-2">
            <!-- Log Inbound Parcel -->
            <div class="bu-card">
              <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 1rem;">
                Log Inbound Gate Parcel
              </h3>
              <div class="bu-form-group">
                <label>Student Enrollment Number</label>
                <input type="text" id="parcel-student-id" class="bu-form-control" placeholder="e.g. E23CSEU0412" value="E23CSEU0412" />
              </div>
              <div class="bu-form-group">
                <label>Courier Service</label>
                <select id="parcel-courier-select" class="bu-form-control">
                  <option value="Amazon">Amazon</option>
                  <option value="BlueDart">BlueDart</option>
                  <option value="Blinkit">Blinkit</option>
                  <option value="Delhivery">Delhivery</option>
                </select>
              </div>
              <div class="bu-form-group">
                <label>Rack Location</label>
                <select id="parcel-rack-select" class="bu-form-control">
                  <option value="Gate 2 Rack A">Gate 2 Rack A</option>
                  <option value="Gate 2 Rack B">Gate 2 Rack B</option>
                  <option value="Gate 2 Rack C">Gate 2 Rack C</option>
                </select>
              </div>
              <button class="bu-btn bu-btn-primary" style="width: 100%;" onclick="window.onLogParcel()">
                Log Parcel &amp; Assign Tag
              </button>
            </div>

            <!-- Parcel Queue -->
            <div class="bu-card">
              <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 1rem;">
                Gate Pickup Queue
              </h3>
              <div style="overflow-y: auto; max-height: 480px; display: flex; flex-direction: column; gap: 0.75rem;">
                ${parcelQueue.map(p => `
                  <div style="padding: 0.75rem; background: var(--bg-surface); border-radius: 4px; border: 1px solid var(--border-hairline);">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                      <strong style="font-family: var(--font-mono); color: var(--accent);">${p.tag}</strong>
                      <span class="bu-badge ${p.status === 'Collected' ? 'bu-badge-checked' : 'bu-badge-held'}">${p.status}</span>
                    </div>
                    <div style="font-size: 0.8rem; margin: 0.25rem 0;">
                      ${p.studentName} (${p.studentId}) &bull; ${p.meta?.courier} &bull; ${p.meta?.bayRack}
                    </div>
                    ${p.status !== 'Collected' ? `
                      <button class="bu-btn bu-btn-primary bu-btn-sm" style="margin-top: 0.4rem;" onclick="window.onAdvanceStage('${p.id}', 'Collected')">
                        Hand Over &amp; Mark Collected
                      </button>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Tab 4: ROOM APPROVALS -->
        ${activeTab === 'rooms' ? `
          <div class="bu-card">
            <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 1rem;">
              Club Room &amp; Seminar Hall Requests
            </h3>
            <div style="overflow-x: auto;">
              <table class="bu-table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Venue</th>
                    <th>Date &amp; Time</th>
                    <th>Club / Organizer</th>
                    <th>Purpose</th>
                    <th>Approval Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${roomsQueue.map(rm => `
                    <tr>
                      <td style="font-family: var(--font-mono); font-weight: 700;">${rm.tag}</td>
                      <td><strong>${rm.resourceId}</strong></td>
                      <td style="font-family: var(--font-mono);">${rm.date} (${rm.startHour}:00 &ndash; ${rm.endHour}:00)</td>
                      <td>${rm.meta?.clubName || rm.studentName}</td>
                      <td>${rm.meta?.purpose || 'Club Session'}</td>
                      <td>
                        ${rm.status === 'Pending Approval' ? `
                          <button class="bu-btn bu-btn-primary bu-btn-sm" onclick="window.onAdvanceStage('${rm.id}', 'Approved')">
                            Approve Venue
                          </button>
                        ` : `<span class="bu-badge bu-badge-checked">${rm.status}</span>`}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // --- ACTIONS ---

  window.onStaffTabChange = (tab) => {
    activeTab = tab;
    updateView();
  };

  window.onStaffLookupPass = async () => {
    const input = document.getElementById('staff-scan-input')?.value.trim();
    if (!input) return;
    try {
      const res = await fetch('/api/pass/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeOrEnrollment: input })
      });
      const data = await res.json();
      scannedWallet = data;
      showToast(`Found student pass for ${data.studentId}`, 'info');
      updateView();
    } catch (err) {
      showToast('Student pass not found', 'error');
    }
  };

  window.onStaffQuickChip = (id) => {
    const input = document.getElementById('staff-scan-input');
    if (input) input.value = `PASS-${id}`;
    window.onStaffLookupPass();
  };

  window.onClearScannedWallet = () => {
    scannedWallet = null;
    updateView();
  };

  window.onAdvanceStage = async (bookingId, nextStatus) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      store.state.bookings[bookingId] = data;
      if (scannedWallet && scannedWallet.bookings) {
        const found = scannedWallet.bookings.find(b => b.id === bookingId);
        if (found) found.status = nextStatus;
      }
      store.notify();
      showToast(`Status updated to ${nextStatus}`, 'success');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.onReapGhostsStaff = async () => {
    try {
      const res = await fetch('/api/debug/reap-ghosts', { method: 'POST' });
      const data = await res.json();
      showToast(`Reaper cleared ${data.freedGhostSeats} ghost seats & ${data.freedHolds} holds`, 'warning');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.onLogParcel = async () => {
    const studentId = document.getElementById('parcel-student-id')?.value.trim().toUpperCase();
    const courier = document.getElementById('parcel-courier-select')?.value;
    const rack = document.getElementById('parcel-rack-select')?.value;

    if (!studentId) {
      showToast('Enter student enrollment number', 'warning');
      return;
    }

    const today = formatDate();
    const currentHour = new Date().getHours();
    const startHour = (currentHour >= 8 && currentHour < 20) ? (currentHour % 2 === 0 ? currentHour : currentHour - 1) : 14;
    const slotId = `parcels:PAR-GATE2:${today}:${startHour}`;

    try {
      const res = await fetch('/api/parcels/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'PAR-GATE2',
          slotIds: [slotId],
          studentId,
          studentName: `Student (${studentId})`,
          units: 1,
          meta: {
            courier,
            bayRack: rack,
            trackingNum: `AMZ-IN-${Math.floor(100000 + Math.random() * 900000)}`
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log parcel');

      showToast(`Parcel logged! Tag: ${data.tag}`, 'success');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  updateView();
  return store.subscribe(updateView);
}
