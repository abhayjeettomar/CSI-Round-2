// public/modules/pass/index.js
// Student "Campus Pass" unified QR + active bookings across all modules

import { store } from '../../app-shell/store.js';
import { renderQRPassSVG } from '../../components/QRPass.js';
import { renderBookingCard } from '../../components/BookingCard.js';
import { renderEmptyState } from '../../components/EmptyState.js';

export async function renderPass(container) {
  if (!document.getElementById('pass-css')) {
    const link = document.createElement('link');
    link.id = 'pass-css';
    link.rel = 'stylesheet';
    link.href = '/modules/pass/styles.css';
    document.head.appendChild(link);
  }

  function updateView() {
    const currentUser = store.getCurrentUser();
    const studentId = currentUser?.id || 'E22CSEU0123';
    const studentName = currentUser?.name || 'Aarav Sharma';
    const hostel = currentUser?.hostel || 'C5';
    const room = currentUser?.room || '402';

    // Get active bookings
    const activeBookings = Object.values(store.state.bookings).filter(b =>
      (b.studentId === studentId || b.members.includes(studentId)) &&
      b.status !== 'Cancelled' &&
      b.status !== 'Auto-Released (No-Show)'
    ).sort((a, b) => b.createdAt - a.createdAt);

    // Active holds
    const activeHolds = Object.values(store.state.holds).filter(h =>
      h.studentId === studentId && h.expiresAt > Date.now()
    );

    const passPayload = {
      studentId,
      passCode: `PASS-${studentId}`,
      activeCount: activeBookings.length + activeHolds.length,
      ts: Math.floor(Date.now() / 60000)
    };

    container.innerHTML = `
      <div class="bu-container">
        <header class="bu-page-header">
          <span class="bu-page-eyebrow">UNIFIED STUDENT IDENTITY &amp; RFID PASS</span>
          <h1 class="bu-page-title">Digital Campus Pass</h1>
          <p class="bu-page-subtitle">
            One deterministic QR pass for your entire campus day. Tap at Bennett Library RFID turnstiles, 
            present at Hostel Gate 2 for Amazon packages, or show at Central Laundry.
          </p>
        </header>

        <div class="bu-pass-layout">
          <!-- Left: Physical-Style Digital Campus Pass Card -->
          <div class="bu-ticket-card">
            <div style="background: var(--text-primary); color: #FFFFFF; padding: 1.25rem; text-align: center;">
              <div style="font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.15em; color: var(--accent); text-transform: uppercase;">
                BENNETT UNIVERSITY &bull; GREATER NOIDA
              </div>
              <div style="font-family: var(--font-display); font-size: 1.6rem; font-weight: normal; margin-top: 0.2rem;">
                Student Campus Pass
              </div>
            </div>

            <div style="padding: 1.5rem; text-align: center; background: #FFFFFF;">
              <!-- Deterministic SVG QR Matrix (Zero external network calls) -->
              <div style="display: flex; justify-content: center; margin-bottom: 1rem;">
                ${renderQRPassSVG(passPayload, 200)}
              </div>

              <div style="font-family: var(--font-mono); font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
                PASS-${studentId}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1.25rem;">
                Cryptographic Deterministic Hash &bull; Valid Campus-Wide
              </div>

              <!-- Student Details Grid -->
              <div style="text-align: left; background: var(--bg-surface); padding: 1rem; border-radius: 4px; font-size: 0.85rem; border: 1px solid var(--border-hairline);">
                <div style="margin-bottom: 0.4rem;"><strong>Student Name:</strong> ${studentName}</div>
                <div style="margin-bottom: 0.4rem;"><strong>Enrollment No:</strong> <span style="font-family: var(--font-mono); font-weight: 600;">${studentId}</span></div>
                <div style="margin-bottom: 0.4rem;"><strong>Hostel Residence:</strong> Block ${hostel}, Room ${room}</div>
                <div><strong>Active Reservations:</strong> <span style="font-family: var(--font-mono); font-weight: 600; color: var(--accent);">${activeBookings.length + activeHolds.length}</span></div>
              </div>
            </div>

            <div style="background: var(--bg-surface); padding: 0.75rem 1rem; border-top: 1px dashed var(--border-hairline); font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); text-align: center;">
              BENNETT RFID ENGINE // SECURE MULTI-TERMINAL SYNC
            </div>
          </div>

          <!-- Right: Unified Wallet of Active Bookings -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;">
              <h2 style="font-family: var(--font-display); font-size: 1.85rem;">
                Active Reservations &amp; Holds (${activeBookings.length + activeHolds.length})
              </h2>
              <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
                Auto-synced via SSE
              </span>
            </div>

            ${activeHolds.length > 0 ? `
              <div style="margin-bottom: 1.25rem;">
                <div style="font-size: 0.8rem; font-weight: 700; color: #D97706; text-transform: uppercase; margin-bottom: 0.5rem;">
                  Pending 90-Second Locks (${activeHolds.length})
                </div>
                ${activeHolds.map(h => `
                  <div class="bu-card" style="border-left: 4px solid #D97706; margin-bottom: 0.75rem; background: #FFFBEB;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                      <div>
                        <strong>${h.resourceId} (${h.module.toUpperCase()})</strong>
                        <div style="font-size: 0.8rem; color: #92400E;">Held for ${currentUser.name}</div>
                      </div>
                      <a href="#/${h.module}" class="bu-btn bu-btn-accent bu-btn-sm">
                        Confirm Hold &rarr;
                      </a>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${activeBookings.length === 0 && activeHolds.length === 0 ? renderEmptyState({
              title: 'Wallet is Empty',
              subtitle: 'No active study tables, laundry orders, courts, or parcels tied to your Bennett enrollment ID.',
              actionLabel: 'Explore Services &rarr;',
              actionUrl: '#/'
            }) : `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${activeBookings.map(b => renderBookingCard(b)).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  updateView();
  return store.subscribe(updateView);
}
