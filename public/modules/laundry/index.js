// public/modules/laundry/index.js
// Laundry booking view + Wash Tag tracker + My Laundry Orders

import { store, formatDate } from '../../app-shell/store.js';
import { renderCapacityGauge } from '../../components/CapacityGauge.js';
import { renderSlotPicker } from '../../components/SlotPicker.js';
import { renderStatusTracker } from '../../components/StatusTracker.js';
import { renderEmptyState } from '../../components/EmptyState.js';
import { showToast } from '../../components/Toast.js';

let selectedDate = formatDate();
let selectedService = 'wash+iron';
let selectedSlotId = null;
let bagsCount = 2;
let itemsCount = 14;

export async function renderLaundry(container) {
  // Inject scoped stylesheet if needed
  if (!document.getElementById('laundry-css')) {
    const link = document.createElement('link');
    link.id = 'laundry-css';
    link.rel = 'stylesheet';
    link.href = '/modules/laundry/styles.css';
    document.head.appendChild(link);
  }

  function updateView() {
    const currentUser = store.getCurrentUser();
    const today = formatDate();
    if (!selectedDate) selectedDate = today;

    // Filter laundry slots for selectedDate
    const laundrySlots = Object.values(store.state.slots).filter(s =>
      s.module === 'laundry' && s.date === selectedDate
    ).sort((a, b) => a.startHour - b.startHour);

    // Compute gauge metrics for today
    const totalCap = laundrySlots.reduce((sum, s) => sum + s.capacity, 0);
    const usedCap = laundrySlots.reduce((sum, s) => sum + s.usedCapacity, 0);

    // Filter current user's laundry orders
    const myOrders = Object.values(store.state.bookings).filter(b =>
      b.module === 'laundry' &&
      b.studentId === currentUser?.id &&
      b.status !== 'Cancelled'
    ).sort((a, b) => b.createdAt - a.createdAt);

    // Compute pickup estimate
    const turnaroundMap = { 'wash': 24, 'iron': 12, 'wash+iron': 36 };
    const turnHours = turnaroundMap[selectedService] || 36;
    const chosenSlot = laundrySlots.find(s => s.id === selectedSlotId);
    let pickupText = 'Select a drop window to see earliest pickup';
    if (chosenSlot) {
      const dropEndDate = new Date(`${chosenSlot.date}T${String(chosenSlot.endHour).padStart(2, '0')}:00:00`);
      const pickupDate = new Date(dropEndDate.getTime() + turnHours * 3600000);
      pickupText = `${pickupDate.toDateString()} at ~${String(pickupDate.getHours()).padStart(2, '0')}:00`;
    }

    // 7-day date pills
    const dates = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const str = d.toISOString().split('T')[0];
      dates.push({
        dateStr: str,
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
      });
    }

    container.innerHTML = `
      <div class="bu-container">
        <header class="bu-page-header">
          <span class="bu-page-eyebrow">CENTRAL LAUNDRY DEPOT &bull; BLOCK C-LG</span>
          <h1 class="bu-page-title">Hostel Laundry Turnaround</h1>
          <p class="bu-page-subtitle">
            Your kurtas will be crisp before your 9 AM Data Structures lab. 
            No more sprinting from C-Block only to find every laundry bin full.
          </p>
        </header>

        <!-- Capacity Gauge -->
        <div style="margin-bottom: 2rem;">
          ${renderCapacityGauge({
            title: `Depot Bag Load for ${selectedDate === today ? 'Today' : selectedDate}`,
            used: usedCap,
            total: totalCap,
            unit: 'bags',
            slots: laundrySlots
          })}
        </div>

        <div class="bu-laundry-layout">
          <!-- Left: Booking Form -->
          <div class="bu-card">
            <h2 style="font-family: var(--font-display); font-size: 1.85rem; margin-bottom: 1rem;">Book a Drop Window</h2>

            <!-- Date Selector Pills -->
            <div class="bu-form-group">
              <label>Select Drop Date</label>
              <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.25rem;">
                ${dates.map(d => `
                  <button 
                    type="button"
                    class="bu-date-pill ${d.dateStr === selectedDate ? 'active' : ''}"
                    onclick="window.onLaundryDateChange('${d.dateStr}')"
                    style="
                      padding: 0.45rem 0.85rem; border-radius: 4px; border: 1px solid ${d.dateStr === selectedDate ? 'var(--text-primary)' : 'var(--border-hairline)'};
                      background: ${d.dateStr === selectedDate ? 'var(--text-primary)' : 'var(--bg-card)'};
                      color: ${d.dateStr === selectedDate ? '#FFFFFF' : 'var(--text-primary)'};
                      font-family: var(--font-mono); font-size: 0.8rem; cursor: pointer; white-space: nowrap;
                    "
                  >
                    ${d.label}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Service Selection -->
            <div class="bu-form-group">
              <label>Service Category</label>
              <div class="bu-service-selector">
                <div class="bu-service-card ${selectedService === 'wash' ? 'selected' : ''}" onclick="window.onLaundryServiceChange('wash')">
                  <div style="font-weight: 600; font-size: 0.95rem;">Standard Wash</div>
                  <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--status-checked); margin-top: 0.2rem;">24h Turnaround</div>
                </div>
                <div class="bu-service-card ${selectedService === 'iron' ? 'selected' : ''}" onclick="window.onLaundryServiceChange('iron')">
                  <div style="font-weight: 600; font-size: 0.95rem;">Press &amp; Iron</div>
                  <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--status-held); margin-top: 0.2rem;">12h Turnaround</div>
                </div>
                <div class="bu-service-card ${selectedService === 'wash+iron' ? 'selected' : ''}" onclick="window.onLaundryServiceChange('wash+iron')">
                  <div style="font-weight: 600; font-size: 0.95rem;">Wash + Iron</div>
                  <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent); margin-top: 0.2rem;">36h Turnaround</div>
                </div>
              </div>
            </div>

            <!-- Bags & Items -->
            <div class="bu-grid-2" style="margin-bottom: 1.25rem;">
              <div class="bu-form-group">
                <label>Number of Bags (1&ndash;3)</label>
                <select id="laundry-bags-select" class="bu-form-control" onchange="window.onLaundryBagsChange(this.value)">
                  <option value="1" ${bagsCount === 1 ? 'selected' : ''}>1 Standard Bag</option>
                  <option value="2" ${bagsCount === 2 ? 'selected' : ''}>2 Bags (Consumes 2 capacity)</option>
                  <option value="3" ${bagsCount === 3 ? 'selected' : ''}>3 Bags (Max student cap)</option>
                </select>
              </div>

              <div class="bu-form-group">
                <label>Total Items Count (approx)</label>
                <input type="number" id="laundry-items-input" class="bu-form-control" min="1" max="40" value="${itemsCount}" onchange="window.onLaundryItemsChange(this.value)" />
              </div>
            </div>

            <!-- Hostel & Room -->
            <div class="bu-grid-2" style="margin-bottom: 1.25rem;">
              <div class="bu-form-group">
                <label>Hostel Block</label>
                <select id="laundry-hostel-select" class="bu-form-control">
                  ${['C1','C2','C3','C4','C5','C6','C7','C8','C9','C10','C11','C12','D1','D2','D3','D4','D5','D6'].map(b => `
                    <option value="${b}" ${currentUser?.hostel === b ? 'selected' : ''}>Hostel ${b}</option>
                  `).join('')}
                </select>
              </div>

              <div class="bu-form-group">
                <label>Room Number</label>
                <input type="text" id="laundry-room-input" class="bu-form-control" placeholder="e.g. 402" value="${currentUser?.room || '304'}" />
              </div>
            </div>

            <!-- Drop Window Slot Picker -->
            <div class="bu-form-group">
              <label>Select 2-Hour Drop Window (08:00 &ndash; 22:00)</label>
              ${renderSlotPicker({
                slots: laundrySlots,
                selectedSlotId,
                onSelectName: 'window.onLaundrySlotPick'
              })}
            </div>

            <!-- Smart Turnaround Recommendation Card -->
            <div style="background: var(--bg-surface); padding: 1rem; border-radius: 4px; border: 1px solid var(--border-hairline); margin-bottom: 1.5rem;">
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">
                Smart Turnaround Ready Date:
              </div>
              <div style="font-family: var(--font-mono); font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">
                ${pickupText}
              </div>
            </div>

            <!-- Submit Button -->
            <button 
              type="button"
              class="bu-btn bu-btn-primary" 
              style="width: 100%; padding: 0.85rem;"
              ${!selectedSlotId ? 'disabled' : ''}
              onclick="window.onSubmitLaundryBooking()"
            >
              Generate Wash Tag &amp; Lock Slot (${bagsCount} Bag${bagsCount > 1 ? 's' : ''})
            </button>
          </div>

          <!-- Right: My Laundry Orders -->
          <div>
            <h2 style="font-family: var(--font-display); font-size: 1.85rem; margin-bottom: 1rem;">
              My Active Wash Tags
            </h2>

            ${myOrders.length === 0 ? renderEmptyState({
              title: 'No Active Laundry Orders',
              subtitle: 'You do not have any bags currently dropped at Block C Depot. Book a drop window on the left.',
            }) : `
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${myOrders.map(order => `
                  <div class="bu-card" style="border-top: 3px solid var(--accent);">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                      <span style="font-family: var(--font-mono); font-size: 1.2rem; font-weight: 700; color: var(--accent);">
                        ${order.tag}
                      </span>
                      <span class="bu-badge ${order.status === 'Ready' || order.status === 'Collected' ? 'bu-badge-checked' : 'bu-badge-held'}">
                        ${order.status}
                      </span>
                    </div>

                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                      <div><strong>Drop Window:</strong> ${order.date} (${order.startHour}:00 &ndash; ${order.endHour}:00)</div>
                      <div><strong>Service:</strong> ${order.meta?.serviceType} &bull; ${order.units} Bags (${order.meta?.items || 10} items)</div>
                      <div><strong>Hostel:</strong> ${order.meta?.hostel}-${order.meta?.room}</div>
                      ${order.runId ? `<div style="color:var(--accent); font-family:var(--font-mono); font-size:0.75rem;">CAMPUS RUN: ${order.runId}</div>` : ''}
                    </div>

                    <!-- 5-Step Live Progress Tracker -->
                    ${renderStatusTracker({
                      stages: ['Dropped', 'Washing', 'Ironing', 'Ready', 'Collected'],
                      currentStatus: order.status,
                      statusHistory: order.statusHistory
                    })}

                    ${order.status === 'Dropped' ? `
                      <button class="bu-btn bu-btn-outline bu-btn-sm" style="color:var(--accent); border-color:#FCA5A5; width:100%;" onclick="window.onCancelBooking('${order.id}')">
                        Cancel Drop Reservation
                      </button>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // Bind global event handlers
  window.onLaundryDateChange = (newDate) => {
    selectedDate = newDate;
    selectedSlotId = null;
    updateView();
  };

  window.onLaundryServiceChange = (service) => {
    selectedService = service;
    updateView();
  };

  window.onLaundryBagsChange = (bags) => {
    bagsCount = Number(bags);
    updateView();
  };

  window.onLaundryItemsChange = (items) => {
    itemsCount = Number(items);
  };

  window.onLaundrySlotPick = (slotId) => {
    selectedSlotId = slotId;
    updateView();
  };

  window.onSubmitLaundryBooking = async () => {
    const currentUser = store.getCurrentUser();
    if (!currentUser) {
      showToast('Please select a student persona first', 'warning');
      return;
    }

    if (!selectedSlotId) {
      showToast('Please select a 2-hour drop window slot', 'warning');
      return;
    }

    const hostel = document.getElementById('laundry-hostel-select')?.value || 'C5';
    const room = document.getElementById('laundry-room-input')?.value || '402';

    try {
      const res = await fetch('/api/laundry/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: 'LAU-DROP',
          slotIds: [selectedSlotId],
          studentId: currentUser.id,
          studentName: currentUser.name,
          units: bagsCount,
          meta: {
            serviceType: selectedService === 'wash' ? 'Standard Wash' : selectedService === 'iron' ? 'Press & Iron' : 'Wash + Iron',
            bags: bagsCount,
            items: itemsCount,
            hostel,
            room
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to book laundry drop window');
      }

      showToast(`Wash Tag Generated: ${data.tag}! Drop bags at Block C depot.`, 'success');
      selectedSlotId = null;
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  updateView();
  return store.subscribe(updateView);
}
