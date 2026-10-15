// public/modules/rooms/index.js
// Club Rooms, Innovation Bays, & Seminar Halls reservation page

import { store, formatDate } from '../../app-shell/store.js';
import { renderCalendarGrid } from '../../components/CalendarGrid.js';
import { renderBookingCard } from '../../components/BookingCard.js';
import { renderEmptyState } from '../../components/EmptyState.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

let selectedDate = formatDate();

export async function renderRooms(container) {
  if (!document.getElementById('rooms-css')) {
    const link = document.createElement('link');
    link.id = 'rooms-css';
    link.rel = 'stylesheet';
    link.href = '/modules/rooms/styles.css';
    document.head.appendChild(link);
  }

  function updateView() {
    const currentUser = store.getCurrentUser();
    const today = formatDate();
    if (!selectedDate) selectedDate = today;

    const roomResources = Object.values(store.state.resources).filter(r => r.module === 'rooms');
    const roomBookings = Object.values(store.state.bookings).filter(b => b.module === 'rooms');

    const myRoomBookings = roomBookings.filter(b =>
      b.studentId === currentUser?.id && b.status !== 'Cancelled'
    ).sort((a, b) => b.createdAt - a.createdAt);

    container.innerHTML = `
      <div class="bu-container">
        <header class="bu-page-header">
          <span class="bu-page-eyebrow">CAMPUS VENUES &bull; INNOVATION BAYS</span>
          <h1 class="bu-page-title">Club Rooms &amp; Seminar Halls</h1>
          <p class="bu-page-subtitle">
            Book hackathon pods, robotics fabrication bays, and main auditorium spaces. 
            Small club pods are auto-approved; large halls route to Student Affairs approval in &lt;2 hours.
          </p>
        </header>

        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label style="font-size: 0.85rem; font-weight: 600;">Schedule Date:</label>
            <input 
              type="date" 
              value="${selectedDate}" 
              min="${today}"
              onchange="window.onRoomDateChange(this.value)"
              style="padding: 0.35rem 0.65rem; border: 1px solid var(--border-hairline); border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem;"
            />
          </div>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
            Click any open slot to reserve for your student club
          </span>
        </div>

        <!-- Weekly / Daily Schedule Grid -->
        <div style="margin-bottom: 2rem;">
          ${renderCalendarGrid({
            resources: roomResources,
            bookings: roomBookings,
            targetDate: selectedDate,
            onSelectRoomSlot: 'window.onSelectRoomSlot'
          })}
        </div>

        <!-- My Club Bookings Section -->
        <div>
          <h2 style="font-family: var(--font-display); font-size: 1.85rem; margin-bottom: 1rem;">
            My Club Reservations (${myRoomBookings.length})
          </h2>

          ${myRoomBookings.length === 0 ? renderEmptyState({
            title: 'No Club Room Reservations',
            subtitle: 'You haven\'t scheduled any club activities for this week. Pick an open slot in the schedule above.',
          }) : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem;">
              ${myRoomBookings.map(b => renderBookingCard(b)).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // --- ACTIONS ---

  window.onRoomDateChange = (val) => {
    selectedDate = val;
    updateView();
  };

  window.onSelectRoomSlot = (resourceId, startHour, slotId) => {
    const currentUser = store.getCurrentUser();
    if (!currentUser) {
      showToast('Please select a student persona first', 'warning');
      return;
    }

    const resource = store.state.resources[resourceId];

    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <span class="bu-badge ${resource.autoApprove ? 'bu-badge-checked' : 'bu-badge-held'}" style="margin-bottom: 0.5rem;">
          ${resource.autoApprove ? 'INSTANT AUTO-APPROVAL' : 'REQUIRES STUDENT AFFAIRS APPROVAL'}
        </span>
        <h4 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.25rem;">
          ${resource.name}
        </h4>
        <p style="font-size: 0.85rem; color: var(--text-muted);">
          Date: <strong>${selectedDate}</strong> (${startHour}:00 &ndash; ${startHour + 1}:00) &bull; Capacity: ${resource.capacity} people
        </p>
      </div>

      <div class="bu-form-group">
        <label>Student Club / Society Name</label>
        <input type="text" id="room-club-input" class="bu-form-control" placeholder="e.g. ACM Student Chapter, GDSC, Robotics Club" value="Bennett Tech Guild" />
      </div>

      <div class="bu-form-group">
        <label>Purpose of Reservation</label>
        <textarea id="room-purpose-input" class="bu-form-control" rows="3" placeholder="Describe workshop, hackathon prep, or speaker session...">Agentic AI &amp; Web Systems Hands-On Lab</textarea>
      </div>
    `;

    openModal({
      title: 'Reserve Campus Venue',
      content: modalContent,
      footer: `
        <button class="bu-btn bu-btn-primary bu-btn-sm" id="confirm-room-btn">Submit Reservation</button>
        <button class="bu-btn bu-btn-outline bu-btn-sm" onclick="document.querySelector('.bu-modal-overlay')?.remove()">Cancel</button>
      `
    });

    const confirmBtn = document.getElementById('confirm-room-btn');
    confirmBtn.addEventListener('click', async () => {
      const clubName = modalContent.querySelector('#room-club-input').value.trim();
      const purpose = modalContent.querySelector('#room-purpose-input').value.trim();

      if (!clubName || !purpose) {
        showToast('Please provide both club name and purpose', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/rooms/reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceId,
            slotIds: [slotId],
            studentId: currentUser.id,
            studentName: currentUser.name,
            units: 1,
            meta: { clubName, purpose }
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Venue reservation failed');

        showToast(`Venue booked! Tag: ${data.tag} (${data.status})`, 'success');
        closeModal();
        updateView();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  };

  updateView();
  return store.subscribe(updateView);
}
