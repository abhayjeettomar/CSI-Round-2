// public/modules/library/index.js
// Interactive schematic SVG floor plan, 90s atomic hold timer, cubicle validation, and My Seats

import { store, formatDate } from '../../app-shell/store.js';
import { renderSeatMap } from '../../components/SeatMap.js';
import { renderCapacityGauge } from '../../components/CapacityGauge.js';
import { renderBookingCard } from '../../components/BookingCard.js';
import { renderEmptyState } from '../../components/EmptyState.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

let activeDate = formatDate();
let activeHour = new Date().getHours();
if (activeHour < 8 || activeHour >= 22) activeHour = 16;
let activeHold = null;
let holdCountdownInterval = null;

export async function renderLibrary(container) {
  if (!document.getElementById('library-css')) {
    const link = document.createElement('link');
    link.id = 'library-css';
    link.rel = 'stylesheet';
    link.href = '/modules/library/styles.css';
    document.head.appendChild(link);
  }

  function startHoldCountdown() {
    if (holdCountdownInterval) clearInterval(holdCountdownInterval);
    holdCountdownInterval = setInterval(() => {
      if (!activeHold) {
        clearInterval(holdCountdownInterval);
        return;
      }
      const remainingMs = activeHold.expiresAt - Date.now();
      const countdownEl = document.getElementById('hold-countdown-sec');
      if (countdownEl) {
        if (remainingMs > 0) {
          countdownEl.textContent = `${Math.ceil(remainingMs / 1000)}s`;
        } else {
          countdownEl.textContent = 'Expired';
          activeHold = null;
          clearInterval(holdCountdownInterval);
          showToast('90s Hold expired & seat was released', 'warning');
          updateView();
        }
      }
    }, 1000);
  }

  function updateView() {
    const currentUser = store.getCurrentUser();
    const today = formatDate();
    if (!activeDate) activeDate = today;

    // Check if user currently has an active hold
    const userHolds = Object.values(store.state.holds).filter(h =>
      h.module === 'library' &&
      h.studentId === currentUser?.id &&
      h.expiresAt > Date.now()
    );
    activeHold = userHolds[0] || null;
    if (activeHold) startHoldCountdown();

    // Compute library slot occupancy for activeHour
    const currentHourSlots = Object.values(store.state.slots).filter(s =>
      s.module === 'library' && s.date === activeDate && s.startHour === activeHour
    );
    const totalSeats = currentHourSlots.reduce((sum, s) => sum + s.capacity, 0);
    const bookedSeats = currentHourSlots.reduce((sum, s) => sum + s.usedCapacity, 0);

    // Filter current user's library bookings
    const myBookings = Object.values(store.state.bookings).filter(b =>
      b.module === 'library' &&
      (b.studentId === currentUser?.id || b.members.includes(currentUser?.id)) &&
      b.status !== 'Cancelled'
    ).sort((a, b) => b.createdAt - a.createdAt);

    // Available hours (08:00 to 21:00)
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

    // Hold Banner HTML
    let holdBannerHtml = '';
    if (activeHold) {
      const remainingSec = Math.max(0, Math.ceil((activeHold.expiresAt - Date.now()) / 1000));
      holdBannerHtml = `
        <div class="bu-hold-banner">
          <div>
            <div style="font-weight: 700; color: #92400E; font-size: 1rem;">
              90-SECOND ATOMIC HOLD ACTIVE // ${activeHold.resourceId}
            </div>
            <div style="font-size: 0.85rem; color: #B45309;">
              Seat is locked across all Bennett screens. Confirm to finalize study session booking.
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700; color: #D97706;" id="hold-countdown-sec">
              ${remainingSec}s
            </div>
            <button class="bu-btn bu-btn-accent bu-btn-sm" onclick="window.onConfirmLibraryHold()">
              Confirm &amp; Book Seat
            </button>
            <button class="bu-btn bu-btn-outline bu-btn-sm" style="color: var(--accent);" onclick="window.onReleaseLibraryHold()">
              Release
            </button>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="bu-container">
        <header class="bu-page-header">
          <span class="bu-page-eyebrow">BENNETT CENTRAL LIBRARY &bull; EAST &amp; NORTH WINGS</span>
          <h1 class="bu-page-title">Floor Plan &amp; Quiet Reading Bays</h1>
          <p class="bu-page-subtitle">
            Hold T14 now&mdash;you have 10 minutes to walk past the Nescafé kiosk and tap in. 
            Zero ghost seats, real-time 90-second locks, and collaborative cubicles.
          </p>
        </header>

        ${holdBannerHtml}

        <!-- Top Controls: Hour Tabs & Capacity -->
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <label style="font-size: 0.85rem; font-weight: 600;">Date:</label>
              <input type="date" value="${activeDate}" min="${today}" onchange="window.onLibraryDateSelect(this.value)" style="
                padding: 0.35rem 0.65rem; border: 1px solid var(--border-hairline); border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem;
              " />
            </div>

            <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
              Active Time Slot: <strong>${String(activeHour).padStart(2, '0')}:00 &ndash; ${String(activeHour + 1).padStart(2, '0')}:00</strong>
            </div>
          </div>

          <!-- Hour selector tabs -->
          <div class="bu-hour-tabs">
            ${hours.map(h => `
              <button 
                type="button"
                class="bu-hour-tab ${h === activeHour ? 'active' : ''}"
                onclick="window.onLibraryHourSelect(${h})"
              >
                ${String(h).padStart(2, '0')}:00
              </button>
            `).join('')}
          </div>

          <!-- Capacity Bar for selected hour -->
          ${renderCapacityGauge({
            title: `Library Occupancy at ${activeHour}:00 (${activeDate})`,
            used: bookedSeats,
            total: totalSeats,
            unit: 'seats',
            slots: currentHourSlots
          })}
        </div>

        <div class="bu-library-layout">
          <!-- Left: Schematic SVG Floor Plan -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem;">
              <h2 style="font-family: var(--font-display); font-size: 1.85rem;">Live Architectural Floor Plan</h2>
              <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
                Click any free seat to lock for 90s
              </span>
            </div>

            ${renderSeatMap({
              slots: store.state.slots,
              holds: store.state.holds,
              bookings: store.state.bookings,
              selectedResourceId: activeHold?.resourceId || null,
              activeDate,
              activeHour,
              onSeatClickName: 'window.onLibrarySeatClick'
            })}
          </div>

          <!-- Right: My Reserved Seats -->
          <div>
            <h2 style="font-family: var(--font-display); font-size: 1.85rem; margin-bottom: 1rem;">
              My Study Sessions
            </h2>

            ${myBookings.length === 0 ? renderEmptyState({
              title: 'No Active Library Seats',
              subtitle: 'Click any free table (T01–T24) or cubicle (C01–C08) on the floor plan to lock a seat.',
            }) : `
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${myBookings.map(b => renderBookingCard(b)).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // --- GLOBAL LIBRARY ACTIONS ---

  window.onLibraryDateSelect = (dateStr) => {
    activeDate = dateStr;
    updateView();
  };

  window.onLibraryHourSelect = (hour) => {
    activeHour = hour;
    updateView();
  };

  window.onLibrarySeatClick = async (resourceId) => {
    const currentUser = store.getCurrentUser();
    if (!currentUser) {
      showToast('Please select a student persona first', 'warning');
      return;
    }

    const slotId = `library:${resourceId}:${activeDate}:${activeHour}`;
    const resource = store.state.resources[resourceId];

    // If already held by current user, do nothing
    if (activeHold && activeHold.resourceId === resourceId) return;

    // Check if seat is already occupied or booked
    const slot = store.state.slots[slotId];
    if (slot && slot.usedCapacity >= slot.capacity) {
      showToast(`${resourceId} is already occupied at ${activeHour}:00. Please select another desk.`, 'warning');
      return;
    }

    const isOccupied = Object.values(store.state.bookings).some(b =>
      b.resourceId === resourceId &&
      b.date === activeDate &&
      b.startHour <= activeHour &&
      b.endHour > activeHour &&
      b.status !== 'Cancelled' &&
      b.status !== 'Auto-Released (No-Show)'
    );
    if (isOccupied) {
      showToast(`${resourceId} is already reserved for this hour.`, 'warning');
      return;
    }

    // Cubicle Rule: Requires 2-4 enrollment IDs modal!
    if (resource && resource.type === 'cubicle') {
      openCubicleBookingModal(resourceId, slotId);
      return;
    }

    // Single Table: Call 90-second atomic hold immediately!
    try {
      const res = await fetch('/api/library/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId,
          slotIds: [slotId],
          studentId: currentUser.id,
          studentName: currentUser.name,
          ttlMs: 90000
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Seat could not be held');
      }

      // Immediately register in store
      store.state.holds[data.id] = data;
      activeHold = data;
      showToast(`Locked ${resourceId} for 90s! Confirm in banner above.`, 'success');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.onConfirmLibraryHold = async () => {
    if (!activeHold) return;
    const currentUser = store.getCurrentUser();
    const currentHoldId = activeHold.id;
    const currentResourceId = activeHold.resourceId;
    const currentSlotIds = [...activeHold.slotIds];

    try {
      const res = await fetch('/api/library/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: currentResourceId,
          slotIds: currentSlotIds,
          studentId: currentUser.id,
          studentName: currentUser.name,
          holdId: currentHoldId,
          units: 1,
          meta: { seatName: store.state.resources[currentResourceId]?.name }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reservation failed');

      // CRITICAL FIX: Instantly delete hold from client memory so banner NEVER re-renders!
      delete store.state.holds[currentHoldId];
      for (const [hId, h] of Object.entries(store.state.holds)) {
        if (h.studentId === currentUser.id && h.module === 'library') {
          delete store.state.holds[hId];
        }
      }
      activeHold = null;
      if (holdCountdownInterval) clearInterval(holdCountdownInterval);

      // Immediately add the new booking to client store
      store.state.bookings[data.id] = data;
      for (const sId of currentSlotIds) {
        if (store.state.slots[sId]) {
          store.state.slots[sId].usedCapacity = Math.min(store.state.slots[sId].capacity, store.state.slots[sId].usedCapacity + 1);
        }
      }

      showToast(`Seat Confirmed! Booking Tag: ${data.tag}`, 'success');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.onReleaseLibraryHold = async () => {
    if (!activeHold) return;
    const currentUser = store.getCurrentUser();
    const currentHoldId = activeHold.id;

    try {
      await fetch('/api/library/release-hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdId: currentHoldId, studentId: currentUser.id })
      });

      // Clear from store immediately
      delete store.state.holds[currentHoldId];
      for (const [hId, h] of Object.entries(store.state.holds)) {
        if (h.studentId === currentUser.id && h.module === 'library') {
          delete store.state.holds[hId];
        }
      }
      activeHold = null;
      if (holdCountdownInterval) clearInterval(holdCountdownInterval);
      showToast('Hold released. Seat is now free.', 'info');
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  function openCubicleBookingModal(resourceId, slotId) {
    const currentUser = store.getCurrentUser();
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <span class="bu-badge" style="background: #DCFCE7; color: #166534; margin-bottom: 0.5rem;">
          4-SEAT COLLABORATION CUBICLE
        </span>
        <h4 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.25rem;">
          Reserve ${resourceId}
        </h4>
        <p style="font-size: 0.85rem; color: var(--text-muted);">
          Cubicles require <strong>2 to 4 valid Bennett student enrollment numbers</strong> 
          to prevent solo monopolization of group project rooms.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.2rem;">Member 1 (You)</label>
          <input type="text" class="bu-form-control" value="${currentUser.id}" disabled style="background: var(--bg-surface);" />
        </div>
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.2rem;">Member 2 Enrollment ID (Required)</label>
          <input type="text" id="cubicle-m2" class="bu-form-control" placeholder="e.g. E23CSEU0412" value="E23CSEU0412" />
        </div>
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.2rem;">Member 3 Enrollment ID (Optional)</label>
          <input type="text" id="cubicle-m3" class="bu-form-control" placeholder="e.g. E24ECEU0108" />
        </div>
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.2rem;">Member 4 Enrollment ID (Optional)</label>
          <input type="text" id="cubicle-m4" class="bu-form-control" placeholder="e.g. E22CSEU0045" />
        </div>
      </div>
      <div id="cubicle-error" style="color: var(--accent); font-size: 0.8rem; margin-bottom: 0.5rem; display: none;"></div>
    `;

    openModal({
      title: `Reserve Group Cubicle ${resourceId}`,
      content: modalContent,
      footer: `
        <button class="bu-btn bu-btn-primary bu-btn-sm" id="confirm-cubicle-btn">Book Cubicle</button>
        <button class="bu-btn bu-btn-outline bu-btn-sm" onclick="document.querySelector('.bu-modal-overlay')?.remove()">Cancel</button>
      `
    });

    const confirmBtn = document.getElementById('confirm-cubicle-btn');
    const errorEl = modalContent.querySelector('#cubicle-error');

    confirmBtn.addEventListener('click', async () => {
      const m2 = modalContent.querySelector('#cubicle-m2').value.trim().toUpperCase();
      const m3 = modalContent.querySelector('#cubicle-m3').value.trim().toUpperCase();
      const m4 = modalContent.querySelector('#cubicle-m4').value.trim().toUpperCase();

      const regex = /^E\d{2}[A-Z]{3,4}\d{4}$/i;
      const members = [currentUser.id];

      if (m2) {
        if (!regex.test(m2)) {
          errorEl.textContent = `Invalid Member 2 ID '${m2}'. Must match E22CSEU0123.`;
          errorEl.style.display = 'block';
          return;
        }
        members.push(m2);
      } else {
        errorEl.textContent = 'At least 2 members are required for a group cubicle.';
        errorEl.style.display = 'block';
        return;
      }

      if (m3) {
        if (!regex.test(m3)) {
          errorEl.textContent = `Invalid Member 3 ID '${m3}'.`;
          errorEl.style.display = 'block';
          return;
        }
        members.push(m3);
      }
      if (m4) {
        if (!regex.test(m4)) {
          errorEl.textContent = `Invalid Member 4 ID '${m4}'.`;
          errorEl.style.display = 'block';
          return;
        }
        members.push(m4);
      }

      errorEl.style.display = 'none';

      try {
        const res = await fetch('/api/library/reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceId,
            slotIds: [slotId],
            studentId: currentUser.id,
            studentName: currentUser.name,
            members,
            units: members.length,
            meta: {
              cubicleName: resourceId,
              memberCount: members.length
            }
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cubicle booking failed');

        showToast(`Cubicle ${resourceId} reserved with ${members.length} members!`, 'success');
        closeModal();
        updateView();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    });
  }

  updateView();
  const unsubscribe = store.subscribe(updateView);
  return () => {
    unsubscribe();
    if (holdCountdownInterval) clearInterval(holdCountdownInterval);
  };
}
