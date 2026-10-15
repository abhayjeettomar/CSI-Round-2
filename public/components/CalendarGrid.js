// public/components/CalendarGrid.js
// Week & day view slot grid with conflict detection for Club Rooms & Seminar Halls

export function renderCalendarGrid({ resources = [], bookings = [], targetDate, onSelectRoomSlot = 'window.onSelectRoomSlot' }) {
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

  return `
    <div class="bu-calendar-grid" style="overflow-x: auto; background: var(--bg-card); border: 1px solid var(--border-hairline); border-radius: 4px;">
      <table style="width: 100%; border-collapse: collapse; min-width: 680px; font-size: 0.825rem;">
        <thead>
          <tr style="background: var(--bg-surface); border-bottom: 2px solid var(--border-hairline);">
            <th style="padding: 0.75rem 1rem; text-align: left; font-family: var(--font-mono); width: 100px;">Time</th>
            ${resources.map(r => `
              <th style="padding: 0.75rem 1rem; text-align: left; font-weight: 600; border-left: 1px solid var(--border-hairline);">
                <div>${r.name}</div>
                <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">
                  Cap: ${r.capacity} &bull; ${r.autoApprove ? 'Instant' : 'Req Staff Approval'}
                </div>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${hours.map(h => {
            return `
              <tr style="border-bottom: 1px solid var(--border-hairline);">
                <td style="padding: 0.65rem 1rem; font-family: var(--font-mono); color: var(--text-muted); background: #FAF8F4;">
                  ${String(h).padStart(2, '0')}:00
                </td>
                ${resources.map(r => {
                  // Check booking
                  const booking = bookings.find(b =>
                    b.resourceId === r.id &&
                    b.date === targetDate &&
                    h >= b.startHour &&
                    h < b.endHour &&
                    b.status !== 'Cancelled'
                  );

                  if (booking) {
                    return `
                      <td style="padding: 0.4rem 0.6rem; border-left: 1px solid var(--border-hairline); background: #FEE2E2;">
                        <div style="font-weight: 600; font-size: 0.75rem; color: #991B1B;">
                          ${booking.meta?.clubName || 'Reserved'}
                        </div>
                        <div style="font-family: var(--font-mono); font-size: 0.65rem; color: #B91C1C;">
                          ${booking.meta?.purpose ? booking.meta.purpose.slice(0, 28) + '...' : booking.tag}
                        </div>
                      </td>
                    `;
                  }

                  const slotId = `rooms:${r.id}:${targetDate}:${h}`;
                  return `
                    <td style="padding: 0.4rem 0.6rem; border-left: 1px solid var(--border-hairline);">
                      <button 
                        type="button"
                        onclick="${onSelectRoomSlot}('${r.id}', ${h}, '${slotId}')"
                        style="width: 100%; text-align: center; padding: 0.35rem 0.5rem; border: 1px dashed var(--border-hairline); border-radius: 3px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); transition: all 120ms ease;"
                        onmouseover="this.style.borderColor='var(--text-primary)'; this.style.color='var(--text-primary)';"
                        onmouseout="this.style.borderColor='var(--border-hairline)'; this.style.color='var(--text-muted)';"
                      >
                        + Book
                      </button>
                    </td>
                  `;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}
