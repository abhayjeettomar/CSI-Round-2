// public/modules/database/index.js
// Live Campus Database & Backoffice Inspector

import { store } from '../../app-shell/store.js';
import { showToast } from '../../components/Toast.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { renderEmptyState } from '../../components/EmptyState.js';

let selectedModule = 'all';
let selectedStatus = 'all';
let searchQuery = '';
let activeTab = 'bookings'; // 'bookings' | 'holds' | 'capacity' | 'json'

export async function renderDatabase(container) {
  if (!document.getElementById('database-css')) {
    const link = document.createElement('link');
    link.id = 'database-css';
    link.rel = 'stylesheet';
    link.href = '/modules/database/styles.css';
    document.head.appendChild(link);
  }

  function updateView() {
    const allBookings = Object.values(store.state.bookings || {});
    const allHolds = Object.values(store.state.holds || {});
    const allSlots = Object.values(store.state.slots || {});
    const now = Date.now();

    // Compute live metrics
    const totalBookingsCount = allBookings.length;
    const activeHoldsList = allHolds.filter(h => h.expiresAt > now);
    const activeHoldsCount = activeHoldsList.length;
    const activeCheckedIn = allBookings.filter(b => b.status === 'Checked-In' || b.status === 'Collected').length;
    const totalCapacityUsed = allSlots.reduce((sum, s) => sum + (s.usedCapacity || 0), 0);
    const totalCapacityMax = allSlots.reduce((sum, s) => sum + (s.capacity || 0), 0);

    // Filter bookings based on module, status, and search query
    let filteredBookings = allBookings.filter(b => {
      if (selectedModule !== 'all' && b.module !== selectedModule) return false;
      if (selectedStatus !== 'all' && b.status !== selectedStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTag = (b.tag || '').toLowerCase().includes(q);
        const matchStudentId = (b.studentId || '').toLowerCase().includes(q);
        const matchStudentName = (b.studentName || '').toLowerCase().includes(q);
        const matchRes = (b.resourceId || '').toLowerCase().includes(q);
        const matchDate = (b.date || '').toLowerCase().includes(q);
        const matchStatus = (b.status || '').toLowerCase().includes(q);
        return matchTag || matchStudentId || matchStudentName || matchRes || matchDate || matchStatus;
      }
      return true;
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    container.innerHTML = `
      <div class="bu-container">
        <!-- Page Header -->
        <header class="bu-page-header">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div>
              <span class="bu-page-eyebrow">SYSTEM DATABASE &amp; AUDIT TRAIL // BU PULSE BACKEND</span>
              <h1 class="bu-page-title">Live Campus Database</h1>
              <p class="bu-page-subtitle">
                Real-time visibility into all bookings, active 90-second atomic locks, capacity allocations, and data persistence.
              </p>
            </div>

            <!-- Global Action Controls -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="bu-btn bu-btn-outline bu-btn-sm" onclick="window.onDatabaseResetSeed()" style="border-color: #D97706; color: #92400E;">
                Reset Seed Data
              </button>
              <button class="bu-btn bu-btn-outline bu-btn-sm" onclick="window.onDatabaseRunReaper()">
                Run Ghost Reaper
              </button>
              <button class="bu-btn bu-btn-primary bu-btn-sm" onclick="window.onDatabaseExportJson()">
                Export db.json
              </button>
              <button class="bu-btn bu-btn-outline bu-btn-sm" onclick="window.onDatabaseClearAll()" style="border-color: #F87171; color: #991B1B;">
                Clear All
              </button>
            </div>
          </div>
        </header>

        <!-- Stats Overview Cards -->
        <div class="bu-db-stats-grid">
          <div class="bu-db-stat-card">
            <span class="bu-db-stat-label">Total Bookings</span>
            <div class="bu-db-stat-val">${totalBookingsCount}</div>
            <div class="bu-db-stat-sub">Across 5 Campus Modules</div>
          </div>

          <div class="bu-db-stat-card" style="border-left: 3px solid #D97706;">
            <span class="bu-db-stat-label" style="color: #D97706;">Active 90s Holds</span>
            <div class="bu-db-stat-val" style="color: #D97706;">${activeHoldsCount}</div>
            <div class="bu-db-stat-sub">Real-Time Serialized Locks</div>
          </div>

          <div class="bu-db-stat-card" style="border-left: 3px solid var(--status-checked);">
            <span class="bu-db-stat-label" style="color: var(--status-checked);">Checked In / Active</span>
            <div class="bu-db-stat-val" style="color: var(--status-checked);">${activeCheckedIn}</div>
            <div class="bu-db-stat-sub">Physical Campus Presence</div>
          </div>

          <div class="bu-db-stat-card">
            <span class="bu-db-stat-label">Slot Capacity</span>
            <div class="bu-db-stat-val">${totalCapacityUsed} <span style="font-size: 1.1rem; color: var(--text-muted); font-weight: normal;">/ ${totalCapacityMax}</span></div>
            <div class="bu-db-stat-sub">Allocated Slots Today</div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="bu-db-tabs">
          <button class="bu-db-tab-btn ${activeTab === 'bookings' ? 'active' : ''}" onclick="window.onDatabaseTabChange('bookings')">
            All Bookings (${allBookings.length})
          </button>
          <button class="bu-db-tab-btn ${activeTab === 'holds' ? 'active' : ''}" onclick="window.onDatabaseTabChange('holds')">
            Active 90s Holds (${activeHoldsCount})
          </button>
          <button class="bu-db-tab-btn ${activeTab === 'capacity' ? 'active' : ''}" onclick="window.onDatabaseTabChange('capacity')">
            Capacity &amp; Slots Matrix
          </button>
          <button class="bu-db-tab-btn ${activeTab === 'json' ? 'active' : ''}" onclick="window.onDatabaseTabChange('json')">
            Raw db.json Viewer
          </button>
        </div>

        <!-- TAB 1: ALL BOOKINGS TABLE -->
        ${activeTab === 'bookings' ? `
          <!-- Toolbar: Search & Filters -->
          <div class="bu-db-toolbar">
            <div class="bu-db-toolbar-row">
              <div style="flex: 1; min-width: 260px;">
                <input 
                  type="text" 
                  id="db-search-input" 
                  class="bu-form-control" 
                  placeholder="Search by tag (e.g. BU-LIB), student ID, name, resource, date..."
                  value="${searchQuery}"
                  oninput="window.onDatabaseSearch(this.value)"
                  style="background: #FFFFFF;"
                />
              </div>

              <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
                <!-- Module Filter -->
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <label style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-muted);">Module:</label>
                  <select class="bu-form-control" style="padding: 0.4rem 0.65rem; font-size: 0.85rem;" onchange="window.onDatabaseModuleFilter(this.value)">
                    <option value="all" ${selectedModule === 'all' ? 'selected' : ''}>All Modules</option>
                    <option value="library" ${selectedModule === 'library' ? 'selected' : ''}>Library</option>
                    <option value="laundry" ${selectedModule === 'laundry' ? 'selected' : ''}>Laundry</option>
                    <option value="courts" ${selectedModule === 'courts' ? 'selected' : ''}>Courts</option>
                    <option value="parcels" ${selectedModule === 'parcels' ? 'selected' : ''}>Parcels</option>
                    <option value="rooms" ${selectedModule === 'rooms' ? 'selected' : ''}>Rooms</option>
                  </select>
                </div>

                <!-- Status Filter -->
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <label style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-muted);">Status:</label>
                  <select class="bu-form-control" style="padding: 0.4rem 0.65rem; font-size: 0.85rem;" onchange="window.onDatabaseStatusFilter(this.value)">
                    <option value="all" ${selectedStatus === 'all' ? 'selected' : ''}>All Statuses</option>
                    <option value="Booked" ${selectedStatus === 'Booked' ? 'selected' : ''}>Booked</option>
                    <option value="Checked-In" ${selectedStatus === 'Checked-In' ? 'selected' : ''}>Checked-In</option>
                    <option value="Dropped" ${selectedStatus === 'Dropped' ? 'selected' : ''}>Dropped</option>
                    <option value="Washing" ${selectedStatus === 'Washing' ? 'selected' : ''}>Washing</option>
                    <option value="Ironing" ${selectedStatus === 'Ironing' ? 'selected' : ''}>Ironing</option>
                    <option value="Ready" ${selectedStatus === 'Ready' ? 'selected' : ''}>Ready</option>
                    <option value="Collected" ${selectedStatus === 'Collected' ? 'selected' : ''}>Collected</option>
                    <option value="Cancelled" ${selectedStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>Showing <strong>${filteredBookings.length}</strong> of ${totalBookingsCount} records</span>
              ${searchQuery || selectedModule !== 'all' || selectedStatus !== 'all' ? `
                <button onclick="window.onDatabaseResetFilters()" style="background: none; border: none; color: var(--accent); text-decoration: underline; cursor: pointer; font-size: 0.8rem;">
                  Clear all filters
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Table Container -->
          <div class="bu-db-table-container">
            ${filteredBookings.length === 0 ? renderEmptyState({
              title: 'No Matching Bookings',
              subtitle: 'No records found matching your filter criteria. Try adjusting the search query or module.',
              actionLabel: 'Reset Filters',
              actionUrl: 'javascript:window.onDatabaseResetFilters()'
            }) : `
              <table class="bu-db-table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Module</th>
                    <th>Resource</th>
                    <th>Student</th>
                    <th>Window</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredBookings.map(b => {
                    const isCheckedIn = b.status === 'Checked-In' || b.status === 'Collected';
                    const isCancelled = b.status === 'Cancelled' || b.status === 'Auto-Released (No-Show)';
                    const statusClass = isCheckedIn ? 'bu-badge-checked' : isCancelled ? 'bu-badge-booked' : 'bu-badge-held';
                    
                    return `
                      <tr>
                        <!-- Tag -->
                        <td>
                          <div class="bu-db-tag-pill">
                            <span>${b.tag}</span>
                            <button class="bu-db-copy-btn" title="Copy Tag" onclick="window.onDatabaseCopy('${b.tag}')">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                          </div>
                          ${b.runId ? `<div style="font-family:var(--font-mono); font-size:0.65rem; color:var(--accent);">RUN: ${b.runId}</div>` : ''}
                        </td>

                        <!-- Module -->
                        <td>
                          <span class="bu-badge" style="background: var(--bg-surface); font-size: 0.7rem; text-transform: uppercase;">
                            ${b.module}
                          </span>
                        </td>

                        <!-- Resource -->
                        <td>
                          <div style="font-weight: 600;">${b.resourceId}</div>
                          ${b.meta?.seatName ? `<div style="font-size:0.75rem; color:var(--text-muted);">${b.meta.seatName}</div>` : ''}
                          ${b.meta?.serviceType ? `<div style="font-size:0.75rem; color:var(--text-muted);">${b.meta.serviceType} &bull; ${b.units} bags</div>` : ''}
                          ${b.meta?.sport ? `<div style="font-size:0.75rem; color:var(--text-muted);">${b.meta.sport}</div>` : ''}
                          ${b.meta?.courier ? `<div style="font-size:0.75rem; color:var(--text-muted);">${b.meta.courier} (${b.meta.bayRack})</div>` : ''}
                        </td>

                        <!-- Student -->
                        <td>
                          <div style="font-weight: 500;">${b.studentName || 'Student'}</div>
                          <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">${b.studentId}</div>
                        </td>

                        <!-- Window -->
                        <td>
                          <div style="font-family: var(--font-mono); font-size: 0.8rem;">${b.date}</div>
                          <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
                            ${String(b.startHour).padStart(2, '0')}:00 &ndash; ${String(b.endHour).padStart(2, '0')}:00
                          </div>
                        </td>

                        <!-- Status -->
                        <td>
                          <span class="bu-badge ${statusClass}">
                            ${b.status}
                          </span>
                        </td>

                        <!-- Actions -->
                        <td>
                          <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
                            ${!isCheckedIn && !isCancelled ? `
                              <button class="bu-btn bu-btn-primary bu-btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="window.onDatabaseCheckIn('${b.id}')">
                                Check In
                              </button>
                            ` : ''}

                            ${b.module === 'laundry' && b.status !== 'Collected' && !isCancelled ? `
                              <button class="bu-btn bu-btn-outline bu-btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="window.onDatabaseAdvanceLaundry('${b.id}', '${b.status}')">
                                Advance &rarr;
                              </button>
                            ` : ''}

                            <button class="bu-btn bu-btn-outline bu-btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="window.onDatabaseInspectBooking('${b.id}')">
                              Inspect
                            </button>

                            <button class="bu-btn bu-btn-outline bu-btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: #DC2626; border-color: #FCA5A5;" onclick="window.onDatabaseDeleteBooking('${b.id}')" title="Delete from database">
                              Purge
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>
        ` : ''}

        <!-- TAB 2: ACTIVE 90-SECOND HOLDS -->
        ${activeTab === 'holds' ? `
          <div class="bu-card">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;">
              <h3 style="font-family: var(--font-display); font-size: 1.5rem;">
                Active Distributed Holds (${activeHoldsCount})
              </h3>
              <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
                Auto-freed after 90 seconds TTL
              </span>
            </div>

            ${activeHoldsList.length === 0 ? renderEmptyState({
              title: 'No Active Holds in Memory',
              subtitle: 'There are currently zero pending 90-second seat or module locks. Click any seat on the library map to observe a live hold.',
              actionLabel: 'Go to Library Floor Plan &rarr;',
              actionUrl: '#/library'
            }) : `
              <div class="bu-db-table-container">
                <table class="bu-db-table">
                  <thead>
                    <tr>
                      <th>Hold ID</th>
                      <th>Module</th>
                      <th>Resource</th>
                      <th>Held By Student</th>
                      <th>TTL Remaining</th>
                      <th>Slots Locked</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${activeHoldsList.map(h => {
                      const remainingSec = Math.max(0, Math.ceil((h.expiresAt - now) / 1000));
                      return `
                        <tr>
                          <td style="font-family: var(--font-mono); font-weight: 700; color: #D97706;">${h.id}</td>
                          <td><span class="bu-badge" style="background: var(--bg-surface);">${h.module}</span></td>
                          <td><strong>${h.resourceId}</strong></td>
                          <td>${h.studentName} (${h.studentId})</td>
                          <td style="font-family: var(--font-mono); font-weight: 700; color: #DC2626;">
                            ${remainingSec}s left
                          </td>
                          <td style="font-family: var(--font-mono); font-size: 0.75rem;">${(h.slotIds || []).join(', ')}</td>
                          <td>
                            <button class="bu-btn bu-btn-outline bu-btn-sm" style="color: #DC2626; border-color: #FCA5A5;" onclick="window.onDatabaseReleaseHold('${h.id}', '${h.studentId}')">
                              Force Release
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        ` : ''}

        <!-- TAB 3: CAPACITY & SLOTS MATRIX -->
        ${activeTab === 'capacity' ? `
          <div class="bu-card">
            <h3 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 1rem;">
              Campus Resources &amp; Slot Allocation Overview
            </h3>

            <div class="bu-db-table-container">
              <table class="bu-db-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Total Resources</th>
                    <th>Allocated Slots Today</th>
                    <th>Booked Units</th>
                    <th>Peak Hour</th>
                  </tr>
                </thead>
                <tbody>
                  ${['library', 'laundry', 'courts', 'parcels', 'rooms'].map(mod => {
                    const modSlots = allSlots.filter(s => s.module === mod);
                    const totalCap = modSlots.reduce((sum, s) => sum + s.capacity, 0);
                    const usedCap = modSlots.reduce((sum, s) => sum + s.usedCapacity, 0);
                    const modRes = Object.values(store.state.resources || {}).filter(r => r.module === mod);

                    return `
                      <tr>
                        <td><strong style="text-transform: uppercase; font-family: var(--font-mono);">${mod}</strong></td>
                        <td>${modRes.length} Registered Nodes</td>
                        <td>${modSlots.length} Slots Generated</td>
                        <td>
                          <strong>${usedCap}</strong> / ${totalCap} Units
                          <div style="width: 120px; height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden; margin-top: 4px;">
                            <div style="width: ${totalCap > 0 ? (usedCap / totalCap) * 100 : 0}%; height: 100%; background: var(--accent);"></div>
                          </div>
                        </td>
                        <td style="font-family: var(--font-mono);">16:00 &ndash; 18:00</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- TAB 4: RAW JSON VIEWER -->
        ${activeTab === 'json' ? `
          <div class="bu-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="font-family: var(--font-display); font-size: 1.5rem;">
                Raw State Tree (In-Memory + data/db.json)
              </h3>
              <button class="bu-btn bu-btn-primary bu-btn-sm" onclick="window.onDatabaseCopyJson()">
                Copy Full State JSON
              </button>
            </div>

            <div class="bu-db-json-box" id="db-raw-json-pre">
${escapeHtml(JSON.stringify(store.state, null, 2))}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // --- ACTIONS & HANDLERS ---

  window.onDatabaseTabChange = (tab) => {
    activeTab = tab;
    updateView();
  };

  window.onDatabaseModuleFilter = (mod) => {
    selectedModule = mod;
    updateView();
  };

  window.onDatabaseStatusFilter = (st) => {
    selectedStatus = st;
    updateView();
  };

  window.onDatabaseSearch = (q) => {
    searchQuery = q;
    updateView();
  };

  window.onDatabaseResetFilters = () => {
    selectedModule = 'all';
    selectedStatus = 'all';
    searchQuery = '';
    updateView();
  };

  window.onDatabaseCopy = (txt) => {
    navigator.clipboard?.writeText(txt);
    showToast(`Copied tag: ${txt}`, 'info');
  };

  window.onDatabaseCheckIn = async (bookingId) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in failed');
      store.state.bookings[bookingId] = data;
      store.notify();
      showToast(`Booking ${data.tag} Checked In!`, 'success');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.onDatabaseAdvanceLaundry = async (bookingId, currentStatus) => {
    const sequence = ['Dropped', 'Washing', 'Ironing', 'Ready', 'Collected'];
    const idx = sequence.indexOf(currentStatus);
    const nextStatus = idx >= 0 && idx < sequence.length - 1 ? sequence[idx + 1] : 'Collected';

    try {
      const res = await fetch(`/api/bookings/${bookingId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance status');
      store.state.bookings[bookingId] = data;
      store.notify();
      showToast(`Booking ${data.tag} advanced to '${nextStatus}'!`, 'success');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.onDatabaseDeleteBooking = async (bookingId) => {
    if (!confirm(`Are you sure you want to permanently delete booking ${bookingId} from the database?`)) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      delete store.state.bookings[bookingId];
      store.notify();
      showToast(`Booking ${bookingId} purged from database.`, 'info');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.onDatabaseReleaseHold = async (holdId, studentId) => {
    try {
      const res = await fetch('/api/library/release-hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdId, studentId })
      });
      if (!res.ok) throw new Error('Failed to release hold');
      delete store.state.holds[holdId];
      store.notify();
      showToast(`Hold ${holdId} forcefully released.`, 'info');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.onDatabaseInspectBooking = (bookingId) => {
    const booking = store.state.bookings[bookingId];
    if (!booking) return;

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div style="margin-bottom: 1rem;">
        <span class="bu-badge" style="background: var(--bg-surface); text-transform: uppercase;">
          ${booking.module}
        </span>
        <h4 style="font-family: var(--font-display); font-size: 1.6rem; margin-top: 0.25rem;">
          ${booking.tag}
        </h4>
        <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
          ID: ${booking.id} &bull; Created: ${new Date(booking.createdAt).toLocaleString()}
        </div>
      </div>

      <div style="background: #141413; color: #A3E635; font-family: var(--font-mono); font-size: 0.785rem; padding: 1rem; border-radius: 4px; overflow-x: auto; max-height: 350px;">
${escapeHtml(JSON.stringify(booking, null, 2))}
      </div>
    `;

    openModal({
      title: `Inspect Booking [${booking.tag}]`,
      content: modalContent,
      footer: `
        <button class="bu-btn bu-btn-outline bu-btn-sm" onclick="document.querySelector('.bu-modal-overlay')?.remove()">Close</button>
      `
    });
  };

  window.onDatabaseResetSeed = async () => {
    if (!confirm('Reset entire system database to initial Bennett University seed data?')) return;
    try {
      const res = await fetch('/api/debug/reset-seed', { method: 'POST' });
      const data = await res.json();
      await store.init();
      showToast(`Database reset to initial seed! (${data.bookings} bookings, ${data.users} students)`, 'success');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.onDatabaseClearAll = async () => {
    if (!confirm('WARNING: Clear ALL bookings and active holds from the database?')) return;
    try {
      const res = await fetch('/api/debug/clear-all', { method: 'POST' });
      await store.init();
      showToast('All bookings and holds cleared.', 'warning');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.onDatabaseRunReaper = async () => {
    try {
      const res = await fetch('/api/debug/reap-ghosts', { method: 'POST' });
      const data = await res.json();
      await store.init();
      showToast(`Reaper cleared ${data.freedGhostSeats} ghost seats & ${data.freedHolds} holds!`, 'info');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.onDatabaseExportJson = () => {
    const jsonStr = JSON.stringify(store.state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bu-pulse-database-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Database exported to JSON file', 'success');
  };

  window.onDatabaseCopyJson = () => {
    navigator.clipboard?.writeText(JSON.stringify(store.state, null, 2));
    showToast('Full state JSON copied to clipboard', 'info');
  };

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  updateView();
  return store.subscribe(updateView);
}
