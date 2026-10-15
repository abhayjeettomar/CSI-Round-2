// public/modules/run/index.js
// "Campus Run" atomic multi-module planner & unified timeline card

import { store, formatDate } from '../../app-shell/store.js';
import { renderEmptyState } from '../../components/EmptyState.js';
import { showToast } from '../../components/Toast.js';

let selectedDate = formatDate();
let windowStart = 16;
let windowEnd = 19;
let selectedTasks = ['laundry', 'library'];
let currentPlan = null;
let isPlanning = false;

export async function renderRun(container) {
  if (!document.getElementById('run-css')) {
    const link = document.createElement('link');
    link.id = 'run-css';
    link.rel = 'stylesheet';
    link.href = '/modules/run/styles.css';
    document.head.appendChild(link);
  }

  // Pre-fetch plan if none exists
  if (!currentPlan && !isPlanning) {
    fetchPlan();
  }

  async function fetchPlan() {
    isPlanning = true;
    try {
      const res = await fetch('/api/run/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          windowStart,
          windowEnd,
          selectedTasks
        })
      });
      currentPlan = await res.json();
    } catch (err) {
      console.error('[run plan error]:', err);
    } finally {
      isPlanning = false;
      updateView();
    }
  }

  function updateView() {
    const currentUser = store.getCurrentUser();

    // Group user's active bookings by runId
    const userBookings = Object.values(store.state.bookings).filter(b =>
      b.studentId === currentUser?.id &&
      b.runId &&
      b.status !== 'Cancelled'
    );

    const runsMap = new Map();
    for (const b of userBookings) {
      if (!runsMap.has(b.runId)) {
        runsMap.set(b.runId, []);
      }
      runsMap.get(b.runId).push(b);
    }

    // Sort legs inside each run by startHour
    for (const [rId, legs] of runsMap.entries()) {
      legs.sort((a, b) => a.startHour - b.startHour);
    }

    container.innerHTML = `
      <div class="bu-container">
        <header class="bu-page-header">
          <span class="bu-page-eyebrow">ATOMIC MULTI-MODULE ROUTE OPTIMIZER</span>
          <h1 class="bu-page-title">Campus Run Planner</h1>
          <p class="bu-page-subtitle">
            Knock out 2 or 3 campus errands in one seamless trip. The engine optimizes your itinerary across
            laundry depots, study tables, and athletic courts&mdash;then locks all legs in a single atomic transaction.
          </p>
        </header>

        <div class="bu-run-layout">
          <!-- Left: Trip Builder & Itinerary Preview -->
          <div>
            <div class="bu-card" style="margin-bottom: 1.5rem;">
              <h2 style="font-family: var(--font-display); font-size: 1.85rem; margin-bottom: 1rem;">
                1. Configure Your Free Window
              </h2>

              <div class="bu-grid-3" style="margin-bottom: 1.25rem;">
                <div class="bu-form-group">
                  <label>Date</label>
                  <input type="date" value="${selectedDate}" min="${formatDate()}" onchange="window.onRunDateChange(this.value)" class="bu-form-control" />
                </div>
                <div class="bu-form-group">
                  <label>Window Start</label>
                  <select class="bu-form-control" onchange="window.onRunWindowChange('start', this.value)">
                    ${[8, 10, 12, 14, 16, 18].map(h => `
                      <option value="${h}" ${windowStart === h ? 'selected' : ''}>${h}:00</option>
                    `).join('')}
                  </select>
                </div>
                <div class="bu-form-group">
                  <label>Window End</label>
                  <select class="bu-form-control" onchange="window.onRunWindowChange('end', this.value)">
                    ${[12, 14, 16, 18, 20, 22].map(h => `
                      <option value="${h}" ${windowEnd === h ? 'selected' : ''}>${h}:00</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div class="bu-form-group">
                <label>Select Tasks for this Run</label>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                  <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer;">
                    <input type="checkbox" value="laundry" ${selectedTasks.includes('laundry') ? 'checked' : ''} onchange="window.onRunToggleTask('laundry', this.checked)">
                    <span>Laundry Drop (2 Bags)</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer;">
                    <input type="checkbox" value="library" ${selectedTasks.includes('library') ? 'checked' : ''} onchange="window.onRunToggleTask('library', this.checked)">
                    <span>Library Focus Seat</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer;">
                    <input type="checkbox" value="courts" ${selectedTasks.includes('courts') ? 'checked' : ''} onchange="window.onRunToggleTask('courts', this.checked)">
                    <span>Courts / Gym Workout</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer;">
                    <input type="checkbox" value="parcels" ${selectedTasks.includes('parcels') ? 'checked' : ''} onchange="window.onRunToggleTask('parcels', this.checked)">
                    <span>Gate 2 Parcel Pickup</span>
                  </label>
                </div>
              </div>

              <button class="bu-btn bu-btn-outline bu-btn-sm" onclick="window.onReOptimizeRun()">
                Refresh Optimization
              </button>
            </div>

            <!-- Optimized Itinerary Preview -->
            ${currentPlan ? `
              <div class="bu-card-surface">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                  <span class="bu-badge bu-badge-checked">OPTIMIZED ITINERARY READY</span>
                  <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
                    Efficiency Score: <strong>${currentPlan.crowdEfficiencyScore}%</strong> &bull; Total: ${currentPlan.estimatedTotalMinutes} mins
                  </span>
                </div>

                <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 0.5rem;">
                  Your Optimized Timeline
                </h3>

                <!-- Vertical Connected Timeline -->
                <div class="bu-timeline">
                  ${currentPlan.legs.map((leg, idx) => `
                    <div class="bu-timeline-item">
                      <div class="bu-timeline-dot"></div>
                      <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <span style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; color: var(--accent);">
                          ${String(leg.startHour).padStart(2, '0')}:00 &ndash; ${String(leg.endHour).padStart(2, '0')}:00
                        </span>
                        <span class="bu-badge" style="background: #EFECE4;">
                          ${leg.loadLabel} (${leg.loadPct}% load)
                        </span>
                      </div>

                      <div style="font-weight: 600; font-size: 1rem; margin-top: 0.2rem;">
                        Leg ${idx + 1}: ${leg.title} &bull; ${leg.resourceName}
                      </div>
                      <div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 0.15rem;">
                        ${leg.description}
                      </div>
                    </div>
                  `).join('')}
                </div>

                <!-- Execution Button -->
                <button 
                  class="bu-btn bu-btn-accent" 
                  style="width: 100%; padding: 0.95rem; font-size: 1rem;"
                  onclick="window.onExecuteCampusRun()"
                >
                  Confirm &amp; Book All Legs (All-or-Nothing Guarantee)
                </button>
              </div>
            ` : ''}
          </div>

          <!-- Right: Active Campus Runs -->
          <div>
            <h2 style="font-family: var(--font-display); font-size: 1.85rem; margin-bottom: 1rem;">
              My Active Campus Runs
            </h2>

            ${runsMap.size === 0 ? renderEmptyState({
              title: 'No Active Campus Runs',
              subtitle: 'Select your free hours on the left to plan and book an atomic multi-leg errand trip.',
            }) : `
              <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                ${Array.from(runsMap.entries()).map(([runId, legs]) => `
                  <div class="bu-card" style="border: 1.5px solid var(--accent); background: #FAF8F4;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem;">
                      <div>
                        <span class="bu-badge" style="background: #FEE2E2; color: #991B1B; font-weight: 700;">
                          ${runId}
                        </span>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                          ${legs[0].date} &bull; ${legs.length} Legs Booked
                        </div>
                      </div>
                      <span class="bu-badge bu-badge-checked">ACTIVE RUN</span>
                    </div>

                    <!-- Connected Vertical Timeline -->
                    <div class="bu-timeline" style="margin: 0.75rem 0 1rem;">
                      ${legs.map((leg, i) => `
                        <div class="bu-timeline-item" style="margin-bottom: 0.85rem;">
                          <div class="bu-timeline-dot" style="background: ${leg.status === 'Checked-In' ? 'var(--status-checked)' : 'var(--accent)'};"></div>
                          <div style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: 600;">
                            ${leg.startHour}:00 &ndash; ${leg.endHour}:00: ${leg.module.toUpperCase()} [${leg.tag}]
                          </div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">
                            ${leg.resourceId} &bull; Status: <strong>${leg.status}</strong>
                          </div>
                        </div>
                      `).join('')}
                    </div>

                    <a href="#/pass" class="bu-btn bu-btn-primary bu-btn-sm" style="width: 100%;">
                      View Run on Campus Pass QR
                    </a>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // --- ACTIONS ---

  window.onRunDateChange = (val) => {
    selectedDate = val;
    fetchPlan();
  };

  window.onRunWindowChange = (type, val) => {
    if (type === 'start') windowStart = Number(val);
    if (type === 'end') windowEnd = Number(val);
    if (windowStart >= windowEnd) windowEnd = windowStart + 2;
    fetchPlan();
  };

  window.onRunToggleTask = (task, checked) => {
    if (checked && !selectedTasks.includes(task)) {
      selectedTasks.push(task);
    } else if (!checked) {
      selectedTasks = selectedTasks.filter(t => t !== task);
    }
    if (selectedTasks.length < 2) {
      showToast('Please select at least 2 tasks for a Campus Run', 'warning');
    }
    fetchPlan();
  };

  window.onReOptimizeRun = () => {
    fetchPlan();
  };

  window.onExecuteCampusRun = async () => {
    const currentUser = store.getCurrentUser();
    if (!currentUser) {
      showToast('Please select a student persona first', 'warning');
      return;
    }

    if (!currentPlan || !currentPlan.legs || currentPlan.legs.length < 2) {
      showToast('Need at least 2 legs to execute a Campus Run', 'warning');
      return;
    }

    // Prepare atomic payload
    const legsPayload = currentPlan.legs.map(leg => ({
      module: leg.module,
      resourceId: leg.resourceId,
      slotIds: [leg.slotId],
      units: leg.module === 'laundry' ? 2 : 1,
      meta: {
        title: leg.title,
        bags: 2,
        serviceType: 'Wash + Iron',
        hostel: currentUser.hostel || 'C5',
        room: currentUser.room || '402'
      }
    }));

    try {
      const res = await fetch('/api/run/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentUser.id,
          studentName: currentUser.name,
          date: currentPlan.date,
          windowStart: currentPlan.windowStart,
          windowEnd: currentPlan.windowEnd,
          legs: legsPayload
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Campus Run execution failed');
      }

      showToast(`Campus Run Confirmed! ID: ${data.runId} (${data.bookings.length} legs locked atomically)`, 'success');
      currentPlan = null;
      updateView();
    } catch (err) {
      showToast(`Conflict in Campus Run: ${err.message}`, 'error');
    }
  };

  updateView();
  return store.subscribe(updateView);
}
