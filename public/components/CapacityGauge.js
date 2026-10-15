// public/components/CapacityGauge.js
// Live capacity load bar + "Quietest Time to Visit" recommendation engine

export function renderCapacityGauge({ title = 'Live Capacity', used, total, unit = 'slots', slots = [] }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const remaining = Math.max(0, total - used);

  // Status color based on load
  const barColor = pct < 50 ? 'var(--status-checked)' : pct < 80 ? 'var(--status-held)' : 'var(--status-booked)';

  // Find quietest time
  let quietestHtml = '';
  if (slots.length > 0) {
    const sorted = [...slots].sort((a, b) => (a.usedCapacity / a.capacity) - (b.usedCapacity / b.capacity));
    const quietest = sorted[0];
    if (quietest) {
      const qPct = Math.round((quietest.usedCapacity / quietest.capacity) * 100);
      quietestHtml = `
        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-hairline); display: flex; align-items: center; justify-content: space-between; font-size: 0.785rem;">
          <span style="color: var(--text-muted); display: inline-flex; align-items: center; gap: 0.35rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Quietest Time Today:
          </span>
          <span style="font-family: var(--font-mono); font-weight: 600; color: var(--status-checked);">
            ${quietest.startHour}:00 &ndash; ${quietest.endHour}:00 (${qPct}% load)
          </span>
        </div>
      `;
    }
  }

  return `
    <div class="bu-capacity-gauge" style="background: var(--bg-card); border: 1px solid var(--border-hairline); padding: 1.25rem; border-radius: 4px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
        <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">${title}</span>
        <span style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600; color: ${barColor};">
          ${pct}% LOAD
        </span>
      </div>

      <div style="height: 8px; width: 100%; background: var(--bg-surface); border-radius: 4px; overflow: hidden; position: relative;">
        <div style="height: 100%; width: ${pct}%; background: ${barColor}; transition: width 400ms ease; border-radius: 4px;"></div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 0.45rem; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
        <span>${used} ${unit} utilized</span>
        <span>${remaining} ${unit} free right now</span>
      </div>

      ${quietestHtml}
    </div>
  `;
}
