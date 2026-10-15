// public/modules/parcels/index.js
// Student parcel lookup & pickup tracker paired with Gate 2 Security

import { store } from '../../app-shell/store.js';
import { renderStatusTracker } from '../../components/StatusTracker.js';
import { renderEmptyState } from '../../components/EmptyState.js';

export async function renderParcels(container) {
  if (!document.getElementById('parcels-css')) {
    const link = document.createElement('link');
    link.id = 'parcels-css';
    link.rel = 'stylesheet';
    link.href = '/modules/parcels/styles.css';
    document.head.appendChild(link);
  }

  function updateView() {
    const currentUser = store.getCurrentUser();
    const studentId = currentUser?.id;

    // Filter parcels for current student
    const myParcels = Object.values(store.state.bookings).filter(b =>
      b.module === 'parcels' &&
      b.studentId === studentId &&
      b.status !== 'Cancelled'
    ).sort((a, b) => b.createdAt - a.createdAt);

    container.innerHTML = `
      <div class="bu-container">
        <header class="bu-page-header">
          <span class="bu-page-eyebrow">HOSTEL GATE 2 &bull; PARCEL OPERATIONS</span>
          <h1 class="bu-page-title">Hostel Gate 2 Parcel Depot</h1>
          <p class="bu-page-subtitle">
            Track deliveries from Amazon, BlueDart, Blinkit, and Delhivery. 
            Once sorted onto Gate 2 racks, show your Digital Campus Pass QR for instant handover.
          </p>
        </header>

        <div style="display: grid; grid-template-columns: 1fr 340px; gap: 2rem; align-items: flex-start;">
          <!-- Left: My Parcels List -->
          <div>
            <h2 style="font-family: var(--font-display); font-size: 1.85rem; margin-bottom: 1rem;">
              My Inbound Packages (${myParcels.length})
            </h2>

            ${myParcels.length === 0 ? renderEmptyState({
              title: 'No Packages Awaiting Pickup',
              subtitle: 'No deliveries currently logged for your enrollment ID at Gate 2. Switch persona or log one via Staff Consoles.',
              actionLabel: 'Open Gate 2 Staff Logger &rarr;',
              actionUrl: '#/staff/parcels'
            }) : `
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${myParcels.map(p => `
                  <div class="bu-card" style="border-top: 3px solid ${p.status === 'Collected' ? 'var(--status-checked)' : 'var(--accent)'};">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                      <div>
                        <span style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 700; color: var(--accent);">
                          ${p.tag}
                        </span>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
                          Courier: <strong>${p.meta?.courier}</strong> &bull; Tracking: ${p.meta?.trackingNum || 'N/A'}
                        </div>
                      </div>
                      <span class="bu-badge ${p.status === 'Collected' ? 'bu-badge-checked' : 'bu-badge-held'}">
                        ${p.status}
                      </span>
                    </div>

                    <div style="padding: 0.5rem 0.75rem; background: var(--bg-surface); border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem; margin: 0.75rem 0;">
                      Pickup Location: <strong>${p.meta?.bayRack || 'Gate 2 Rack A'}</strong>
                    </div>

                    <!-- 3-Stage Progress Tracker -->
                    ${renderStatusTracker({
                      stages: ['Arrived', 'Ready at Gate', 'Collected'],
                      currentStatus: p.status,
                      statusHistory: p.statusHistory
                    })}

                    ${p.status !== 'Collected' ? `
                      <a href="#/pass" class="bu-btn bu-btn-primary bu-btn-sm" style="display: inline-flex;">
                        Show Pickup QR at Gate 2 Desk &rarr;
                      </a>
                    ` : '<div style="font-size:0.75rem; color:var(--status-checked); font-weight:600;">Handed over at Gate 2</div>'}
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Right: Gate Info & Hours -->
          <div>
            <div class="bu-card">
              <h3 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.75rem;">
                Gate 2 Depot Guidelines
              </h3>
              <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6;">
                <p style="margin-bottom: 0.5rem;">
                  <strong>Operating Hours:</strong> 08:00 AM &ndash; 08:00 PM Daily.
                </p>
                <p style="margin-bottom: 0.5rem;">
                  <strong>Student Verification:</strong> Have your Digital Campus Pass QR ready on your phone for immediate contactless barcode scanning.
                </p>
                <p style="margin-bottom: 0.5rem;">
                  <strong>Holding Period:</strong> Unclaimed deliveries are held for up to 5 days before return-to-sender notice.
                </p>
              </div>

              <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-hairline);">
                <a href="#/staff/parcels" class="bu-btn bu-btn-outline bu-btn-sm" style="width: 100%;">
                  Gate Staff Console &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  updateView();
  return store.subscribe(updateView);
}
