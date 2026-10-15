// public/components/SeatMap.js
// Interactive SVG schematic floor plan for Bennett Central Library (T01-T24, C01-C08)

export function renderSeatMap({
  slots = {},
  holds = {},
  bookings = {},
  selectedResourceId = null,
  activeDate = '',
  activeHour = 16,
  onSeatClickName = 'window.onSeatSelect'
}) {
  const now = Date.now();

  // Helper to get status of a resource for active hour
  function getSeatState(resId) {
    const slotId = `library:${resId}:${activeDate}:${activeHour}`;
    const slot = slots[slotId];

    // Check active hold
    for (const h of Object.values(holds)) {
      if (h.slotIds && h.slotIds.includes(slotId) && h.expiresAt > now) {
        const remainingSec = Math.max(0, Math.ceil((h.expiresAt - now) / 1000));
        return { state: 'held', remainingSec, hold: h };
      }
    }

    // Check booking
    for (const b of Object.values(bookings)) {
      if (
        b.module === 'library' &&
        b.resourceId === resId &&
        b.slotIds &&
        b.slotIds.includes(slotId) &&
        b.status !== 'Cancelled' &&
        b.status !== 'Auto-Released (No-Show)'
      ) {
        return {
          state: b.status === 'Checked-In' ? 'checked-in' : 'booked',
          booking: b
        };
      }
    }

    if (slot && slot.usedCapacity >= slot.capacity) {
      return { state: 'booked' };
    }

    return { state: 'free' };
  }

  // Generate SVG elements for 24 tables (T01-T24)
  let tablesSvg = '';
  // Left Wing: T01 to T12 (Whispering Gallery)
  for (let i = 1; i <= 12; i++) {
    const num = String(i).padStart(2, '0');
    const resId = `LIB-T${num}`;
    const col = (i - 1) % 4;
    const row = Math.floor((i - 1) / 4);
    const x = 70 + col * 75;
    const y = 180 + row * 80;

    const { state: seatState, remainingSec } = getSeatState(resId);
    const isSelected = selectedResourceId === resId;

    let fill = '#EFECE4';
    let stroke = '#141413';
    let strokeWidth = '1.5';
    let labelColor = '#141413';
    let pulseAnim = '';

    if (seatState === 'held') {
      fill = '#FEF3C7';
      stroke = '#D97706';
      strokeWidth = '2';
      labelColor = '#92400E';
      pulseAnim = `<circle cx="${x + 24}" cy="${y + 20}" r="26" fill="none" stroke="#D97706" stroke-width="1.5" opacity="0.6"><animate attributeName="r" values="22;30;22" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.8s" repeatCount="indefinite"/></circle>`;
    } else if (seatState === 'booked') {
      fill = '#FEE2E2';
      stroke = '#D9381E';
      labelColor = '#991B1B';
    } else if (seatState === 'checked-in') {
      fill = '#DCFCE7';
      stroke = '#15803D';
      labelColor = '#166534';
    }

    if (isSelected) {
      stroke = 'var(--text-primary)';
      strokeWidth = '3';
    }

    tablesSvg += `
      <g class="bu-seat-node" onclick="${onSeatClickName}('${resId}')" style="cursor: pointer;">
        ${pulseAnim}
        <!-- Desk -->
        <rect x="${x}" y="${y}" width="48" height="40" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <!-- Chair icon -->
        <rect x="${x + 16}" y="${y + 44}" width="16" height="6" rx="2" fill="${stroke}"/>
        <!-- Seat Label -->
        <text x="${x + 24}" y="${y + 24}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="${labelColor}" text-anchor="middle">
          T${num}
        </text>
        ${seatState === 'held' ? `<text x="${x + 24}" y="${y + 35}" font-family="'JetBrains Mono', monospace" font-size="8" fill="#B45309" text-anchor="middle">${remainingSec}s</text>` : ''}
      </g>
    `;
  }

  // Right Wing: T13 to T24 (Quiet Reading Bay)
  for (let i = 13; i <= 24; i++) {
    const num = String(i).padStart(2, '0');
    const resId = `LIB-T${num}`;
    const col = (i - 13) % 4;
    const row = Math.floor((i - 13) / 4);
    const x = 440 + col * 75;
    const y = 180 + row * 80;

    const { state: seatState, remainingSec } = getSeatState(resId);
    const isSelected = selectedResourceId === resId;

    let fill = '#EFECE4';
    let stroke = '#141413';
    let strokeWidth = '1.5';
    let labelColor = '#141413';
    let pulseAnim = '';

    if (seatState === 'held') {
      fill = '#FEF3C7';
      stroke = '#D97706';
      strokeWidth = '2';
      labelColor = '#92400E';
      pulseAnim = `<circle cx="${x + 24}" cy="${y + 20}" r="26" fill="none" stroke="#D97706" stroke-width="1.5" opacity="0.6"><animate attributeName="r" values="22;30;22" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.8s" repeatCount="indefinite"/></circle>`;
    } else if (seatState === 'booked') {
      fill = '#FEE2E2';
      stroke = '#D9381E';
      labelColor = '#991B1B';
    } else if (seatState === 'checked-in') {
      fill = '#DCFCE7';
      stroke = '#15803D';
      labelColor = '#166534';
    }

    if (isSelected) {
      stroke = 'var(--text-primary)';
      strokeWidth = '3';
    }

    tablesSvg += `
      <g class="bu-seat-node" onclick="${onSeatClickName}('${resId}')" style="cursor: pointer;">
        ${pulseAnim}
        <rect x="${x}" y="${y}" width="48" height="40" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <rect x="${x + 16}" y="${y + 44}" width="16" height="6" rx="2" fill="${stroke}"/>
        <text x="${x + 24}" y="${y + 24}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="${labelColor}" text-anchor="middle">
          T${num}
        </text>
        ${seatState === 'held' ? `<text x="${x + 24}" y="${y + 35}" font-family="'JetBrains Mono', monospace" font-size="8" fill="#B45309" text-anchor="middle">${remainingSec}s</text>` : ''}
      </g>
    `;
  }

  // Generate SVG elements for 8 Collaboration Cubicles (C01-C08) along top
  let cubiclesSvg = '';
  for (let c = 1; c <= 8; c++) {
    const num = String(c).padStart(2, '0');
    const resId = `LIB-C${num}`;
    const x = 50 + (c - 1) * 88;
    const y = 45;

    const { state: cubicleState } = getSeatState(resId);
    const isSelected = selectedResourceId === resId;

    let fill = '#FFFFFF';
    let stroke = '#141413';
    let labelColor = '#141413';

    if (cubicleState === 'booked') {
      fill = '#FEE2E2';
      stroke = '#D9381E';
      labelColor = '#991B1B';
    } else if (cubicleState === 'checked-in') {
      fill = '#DCFCE7';
      stroke = '#15803D';
      labelColor = '#166534';
    }

    if (isSelected) {
      stroke = 'var(--text-primary)';
    }

    cubiclesSvg += `
      <g class="bu-cubicle-node" onclick="${onSeatClickName}('${resId}')" style="cursor: pointer;">
        <!-- Cubicle Enclosure -->
        <rect x="${x}" y="${y}" width="78" height="64" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${isSelected ? '3' : '1.5'}" stroke-dasharray="4,2"/>
        <!-- Central Meeting Table -->
        <rect x="${x + 20}" y="${y + 16}" width="38" height="32" rx="2" fill="var(--bg-surface)" stroke="#5C5A54" stroke-width="1"/>
        <!-- 4 Chairs -->
        <circle cx="${x + 12}" cy="${y + 32}" r="5" fill="#5C5A54"/>
        <circle cx="${x + 66}" cy="${y + 32}" r="5" fill="#5C5A54"/>
        <circle cx="${x + 39}" cy="${y + 8}" r="5" fill="#5C5A54"/>
        <circle cx="${x + 39}" cy="${y + 56}" r="5" fill="#5C5A54"/>
        <!-- Label -->
        <text x="${x + 39}" y="${y + 35}" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="${labelColor}" text-anchor="middle">
          C${num}
        </text>
      </g>
    `;
  }

  return `
    <div class="bu-seatmap-wrapper" style="position: relative; background: var(--bg-card); border: 1px solid var(--border-hairline); border-radius: 4px; overflow: hidden;">
      <!-- Mandatory representation badge -->
      <div style="position: absolute; top: 12px; right: 14px; z-index: 10;">
        <span class="bu-badge" style="background: var(--bg-surface); color: var(--text-muted); font-size: 0.65rem; letter-spacing: 0.05em;">
          SCHEMATIC FLOOR PLAN &mdash; DEMO REPRESENTATION
        </span>
      </div>

      <!-- State Legend -->
      <div style="display: flex; gap: 1.25rem; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-hairline); background: var(--bg-surface); font-size: 0.75rem; font-family: var(--font-mono);">
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="width: 12px; height: 12px; border-radius: 2px; background: #EFECE4; border: 1px solid #141413;"></span>
          <span>Free (Available)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="width: 12px; height: 12px; border-radius: 2px; background: #FEF3C7; border: 1.5px solid #D97706;"></span>
          <span>Held (90s lock)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="width: 12px; height: 12px; border-radius: 2px; background: #FEE2E2; border: 1px solid #D9381E;"></span>
          <span>Booked</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="width: 12px; height: 12px; border-radius: 2px; background: #DCFCE7; border: 1px solid #15803D;"></span>
          <span>Checked-In</span>
        </div>
      </div>

      <!-- Architectural SVG Canvas -->
      <svg viewBox="0 0 800 520" width="100%" height="auto" style="display: block; background: var(--bg-primary);">
        <!-- Outer Building Boundary -->
        <rect x="20" y="15" width="760" height="485" rx="6" fill="#FBF9F4" stroke="var(--border-hairline)" stroke-width="2"/>

        <!-- North Zone: Collaboration Cubicles -->
        <rect x="35" y="25" width="730" height="95" rx="4" fill="none" stroke="var(--border-hairline)" stroke-dasharray="2,2"/>
        <text x="50" y="40" font-family="'JetBrains Mono', monospace" font-size="9" fill="var(--text-muted)" letter-spacing="0.1em">
          ZONE 01: NORTH COLLABORATION CUBICLES (C01&ndash;C08 &bull; 4 SEATS PER CUBICLE)
        </text>
        ${cubiclesSvg}

        <!-- Center Divider Corridor -->
        <line x1="395" y1="140" x2="395" y2="430" stroke="var(--border-hairline)" stroke-width="1.5" stroke-dasharray="6,4"/>

        <!-- East Wing: Whispering Gallery -->
        <text x="70" y="155" font-family="'Instrument Serif', serif" font-size="18" fill="var(--text-primary)">
          Whispering Gallery (T01&ndash;T12)
        </text>
        <text x="70" y="170" font-family="'JetBrains Mono', monospace" font-size="8" fill="var(--text-muted)">
          LIGHT NATURAL AMBIENT READ &bull; POWER OUTLET EQUIPPED
        </text>

        <!-- West Wing: Quiet Reading Bay -->
        <text x="440" y="155" font-family="'Instrument Serif', serif" font-size="18" fill="var(--text-primary)">
          Quiet Reading Bay (T13&ndash;T24)
        </text>
        <text x="440" y="170" font-family="'JetBrains Mono', monospace" font-size="8" fill="var(--text-muted)">
          PIN-DROP SILENCE CARRELS &bull; DESK ILLUMINATION
        </text>

        <!-- Tables nodes -->
        ${tablesSvg}

        <!-- South Amenities: Circulation Desk & RFID Gates -->
        <g transform="translate(0, 440)">
          <!-- Circulation Desk -->
          <rect x="280" y="10" width="230" height="35" rx="3" fill="var(--bg-surface)" stroke="var(--border-strong)" stroke-width="1.5"/>
          <text x="395" y="32" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="600" fill="var(--text-primary)" text-anchor="middle">
            CIRCULATION &amp; REFERENCE DESK
          </text>

          <!-- RFID Entry Turnstiles -->
          <rect x="120" y="25" width="80" height="20" rx="2" fill="none" stroke="var(--border-hairline)" stroke-dasharray="3,2"/>
          <text x="160" y="39" font-family="'JetBrains Mono', monospace" font-size="8" fill="var(--text-muted)" text-anchor="middle">
            &larr; RFID ENTRY GATES
          </text>

          <!-- Walkway to Nescafé kiosk -->
          <rect x="590" y="25" width="130" height="20" rx="2" fill="none" stroke="var(--border-hairline)" stroke-dasharray="3,2"/>
          <text x="655" y="39" font-family="'JetBrains Mono', monospace" font-size="8" fill="var(--text-muted)" text-anchor="middle">
            NESCAFÉ WALKWAY EXIT &rarr;
          </text>
        </g>
      </svg>
    </div>
  `;
}
