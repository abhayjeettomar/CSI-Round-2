// public/modules/courts/index.js
// Sports Courts & Bennett Fitness Centre booking view

import { store, formatDate } from '../../app-shell/store.js';
import { renderCapacityGauge } from '../../components/CapacityGauge.js';
import { renderSlotPicker } from '../../components/SlotPicker.js';
import { renderBookingCard } from '../../components/BookingCard.js';
import { renderEmptyState } from '../../components/EmptyState.js';
import { showToast } from '../../components/Toast.js';

let selectedSport = 'all';
let selectedCourtId = 'CRT-BD01';
let selectedDate = formatDate();
let selectedSlotId = null;

export async function renderCourts(container) {
  if (!document.getElementById('courts-css')) {
    const link = document.createElement('link');
    link.id = 'courts-css';
    link.rel = 'stylesheet';
    link.href = '/modules/courts/styles.css';
    document.head.appendChild(link);
  }

  function updateView() {
    const currentUser = store.getCurrentUser();
    const today = formatDate();
    if (!selectedDate) selectedDate = today;

    // Get court resources
    const allCourtRes = Object.values(store.state.resources).filter(r => r.module === 'courts');
    const filteredRes = selectedSport === 'all' 
      ? allCourtRes 
      : allCourtRes.filter(r => r.type.toLowerCase() === selectedSport.toLowerCase());

    const activeCourt = store.state.resources[selectedCourtId] || allCourtRes[0];

    // Get slots for activeCourt on selectedDate
    const courtSlots = Object.values(store.state.slots).filter(s =>
      s.module === 'courts' && s.resourceId === activeCourt?.id && s.date === selectedDate
    ).sort((a, b) => a.startHour - b.startHour);

    const totalCap = courtSlots.reduce((sum, s) => sum + s.capacity, 0);
    const usedCap = courtSlots.reduce((sum, s) => sum + s.usedCapacity, 0);

    // Current student's court bookings
    const myCourtBookings = Object.values(store.state.bookings).filter(b =>
      b.module === 'courts' &&
      b.studentId === currentUser?.id &&
      b.status !== 'Cancelled'
    ).sort((a, b) => b.createdAt - a.createdAt);

    container.innerHTML = `
      <div class="bu-container">
        <header class="bu-page-header">
          <span class="bu-page-eyebrow">SPORTS COMPLEX &bull; ATHLETICS ARENA</span>
          <h1 class="bu-page-title">Sports Courts &amp; Fitness Centre</h1>
          <p class="bu-page-subtitle">
            Reserve floodlit indoor badminton courts, acrylic basketball arenas, astro-turf football pitch, 
            and heavy cardio sessions at Bennett Fitness Centre. Max 1 court slot per student per day.
          </p>
        </header>

        <!-- Sports Filter Pills -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
          ${['all', 'badminton', 'basketball', 'football', 'gym'].map(sp => `
            <button 
              class="bu-btn bu-btn-sm ${selectedSport === sp ? 'bu-btn-primary' : 'bu-btn-outline'}"
              onclick="window.onSportFilter('${sp}')"
              style="text-transform: capitalize;"
            >
              ${sp === 'all' ? 'All Facilities' : sp}
            </button>
          `).join('')}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 340px; gap: 2rem; align-items: flex-start;">
          <!-- Left: Resource Selector & Slots -->
          <div>
            <h2 style="font-family: var(--font-display); font-size: 1.85rem; margin-bottom: 1rem;">
              1. Choose Facility
            </h2>

            <!-- Facility Cards Grid -->
            <div class="bu-courts-grid" style="margin-bottom: 2rem;">
              ${filteredRes.map(court => `
                <div 
                  class="bu-court-card ${court.id === activeCourt?.id ? 'selected' : ''}"
                  onclick="window.onSelectCourt('${court.id}')"
                >
                  <div style="font-weight: 700; font-size: 1.05rem;">${court.name}</div>
                  <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
                    Capacity: ${court.capacity} players &bull; ${court.meta?.surface || 'Standard'}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Date & Slot Picker -->
            <div class="bu-card">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;">
                <h3 style="font-family: var(--font-display); font-size: 1.5rem;">
                  2. Select 1-Hour Slot for ${activeCourt?.name}
                </h3>
                <input 
                  type="date" 
                  value="${selectedDate}" 
                  min="${today}"
                  onchange="window.onCourtDateChange(this.value)"
                  style="padding: 0.35rem 0.65rem; border: 1px solid var(--border-hairline); border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem;"
                />
              </div>

              <!-- Capacity Gauge for this court -->
              <div style="margin-bottom: 1.5rem;">
                ${renderCapacityGauge({
                  title: `Court Load: ${activeCourt?.name} (${selectedDate})`,
                  used: usedCap,
                  total: totalCap,
                  unit: 'players',
                  slots: courtSlots
                })}
              </div>

              ${renderSlotPicker({
                slots: courtSlots,
                selectedSlotId,
                onSelectName: 'window.onCourtSlotPick'
              })}

              <button 
                class="bu-btn bu-btn-primary" 
                style="width: 100%; margin-top: 1.5rem; padding: 0.85rem;"
                ${!selectedSlotId ? 'disabled' : ''}
                onclick="window.onSubmitCourtBooking()"
              >
                Confirm Court Reservation
              </button>
            </div>
          </div>

          <!-- Right: My Court Bookings -->
          <div>
            <h2 style="font-family: var(--font-display); font-size: 1.85rem; margin-bottom: 1rem;">
              My Active Sessions
            </h2>

            ${myCourtBookings.length === 0 ? renderEmptyState({
              title: 'No Court Bookings',
              subtitle: 'Select a sport and reserve an open hour on the left.',
            }) : `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${myCourtBookings.map(b => renderBookingCard(b)).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // --- ACTIONS ---

  window.onSportFilter = (sp) => {
    selectedSport = sp;
    const allCourtRes = Object.values(store.state.resources).filter(r => r.module === 'courts');
    const filtered = sp === 'all' ? allCourtRes : allCourtRes.filter(r => r.type.toLowerCase() === sp.toLowerCase());
    if (filtered.length > 0) selectedCourtId = filtered[0].id;
    selectedSlotId = null;
    updateView();
  };

  window.onSelectCourt = (courtId) => {
    selectedCourtId = courtId;
    selectedSlotId = null;
    updateView();
  };

  window.onCourtDateChange = (d) => {
    selectedDate = d;
    selectedSlotId = null;
    updateView();
  };

  window.onCourtSlotPick = (sId) => {
    selectedSlotId = sId;
    updateView();
  };

  window.onSubmitCourtBooking = async () => {
    const currentUser = store.getCurrentUser();
    if (!currentUser) {
      showToast('Please select a student persona first', 'warning');
      return;
    }

    if (!selectedSlotId) return;

    try {
      const res = await fetch('/api/courts/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: selectedCourtId,
          slotIds: [selectedSlotId],
          studentId: currentUser.id,
          studentName: currentUser.name,
          units: selectedCourtId === 'CRT-GYM01' ? 1 : 2,
          meta: {
            sport: store.state.resources[selectedCourtId]?.type,
            courtName: store.state.resources[selectedCourtId]?.name
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Court reservation failed');

      showToast(`Court Reserved! Tag: ${data.tag}`, 'success');
      selectedSlotId = null;
      updateView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  updateView();
  return store.subscribe(updateView);
}
