// public/components/BookingCard.js
// Unified booking card with countdowns, check-in, extend, cancel, and status strip

export function renderBookingCard(booking, isStaff = false) {
  const now = Date.now();
  const isLibrary = booking.module === 'library';
  const isLaundry = booking.module === 'laundry';
  const isCheckedIn = booking.status === 'Checked-In' || booking.status === 'Collected';
  const isCancelled = booking.status === 'Cancelled' || booking.status === 'Auto-Released (No-Show)';

  let deadlineHtml = '';
  if (isLibrary && booking.status === 'Booked' && booking.checkInDeadline) {
    const diffMs = booking.checkInDeadline - now;
    if (diffMs > 0) {
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      deadlineHtml = `
        <div style="margin-top: 0.5rem; padding: 0.35rem 0.6rem; background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 3px; font-family: var(--font-mono); font-size: 0.75rem; color: #92400E; display: flex; align-items: center; justify-content: space-between;">
          <span>10-min check-in window:</span>
          <strong>${mins}m ${secs}s left</strong>
        </div>
      `;
    } else {
      deadlineHtml = `
        <div style="margin-top: 0.5rem; padding: 0.35rem 0.6rem; background: #FEE2E2; border-radius: 3px; font-family: var(--font-mono); font-size: 0.75rem; color: #991B1B;">
          Check-in deadline expired &bull; Seat subject to auto-release
        </div>
      `;
    }
  }

  // Status color
  const statusClass = isCheckedIn ? 'bu-badge-checked' : isCancelled ? 'bu-badge-booked' : 'bu-badge-held';

  return `
    <div class="bu-card bu-booking-card" id="booking-${booking.id}" style="margin-bottom: 1rem; border-left: 4px solid ${isCheckedIn ? 'var(--status-checked)' : isCancelled ? 'var(--text-muted)' : 'var(--accent)'};">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
        <div>
          <span class="bu-badge" style="background: var(--bg-surface); text-transform: uppercase; margin-bottom: 0.25rem;">
            ${booking.module}
          </span>
          <div style="font-family: var(--font-mono); font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">
            ${booking.tag}
          </div>
        </div>
        <span class="bu-badge ${statusClass}">
          ${booking.status}
        </span>
      </div>

      <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.75rem;">
        <div><strong>Date:</strong> ${booking.date} (${String(booking.startHour).padStart(2, '0')}:00 &ndash; ${String(booking.endHour).padStart(2, '0')}:00)</div>
        <div><strong>Resource:</strong> ${booking.resourceId} ${booking.meta?.seatName ? `(${booking.meta.seatName})` : ''}</div>
        <div><strong>Student:</strong> ${booking.studentName} (${booking.studentId})</div>
        ${booking.runId ? `<div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent);">CAMPUS RUN: ${booking.runId}</div>` : ''}
        ${isLaundry && booking.meta?.serviceType ? `<div><strong>Service:</strong> ${booking.meta.serviceType} (${booking.meta.bags} bags, ${booking.meta.items} items) &bull; Hostel ${booking.meta.hostel}-${booking.meta.room}</div>` : ''}
      </div>

      ${deadlineHtml}

      <!-- Actions -->
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-hairline);">
        ${!isCheckedIn && !isCancelled ? `
          <button class="bu-btn bu-btn-primary bu-btn-sm" onclick="window.onCheckInBooking('${booking.id}')">
            Check In Now
          </button>
        ` : ''}

        ${isLibrary && !isCancelled && booking.endHour < 22 ? `
          <button class="bu-btn bu-btn-outline bu-btn-sm" onclick="window.onExtendLibraryBooking('${booking.id}')">
            Extend +1 Hr
          </button>
        ` : ''}

        ${!isCancelled && booking.status !== 'Collected' ? `
          <button class="bu-btn bu-btn-outline bu-btn-sm" style="color: var(--accent); border-color: #FCA5A5;" onclick="window.onCancelBooking('${booking.id}')">
            Cancel
          </button>
        ` : ''}

        <!-- Demo button for judges to test 10m ghost expiry without waiting -->
        ${isLibrary && booking.status === 'Booked' ? `
          <button class="bu-btn bu-btn-sm" style="background: #FEF3C7; color: #92400E; border: 1px dashed #D97706;" onclick="window.onSimulateGhostExpiry('${booking.id}')">
            Simulate 10m No-Show Expiry
          </button>
        ` : ''}
      </div>
    </div>
  `;
}
