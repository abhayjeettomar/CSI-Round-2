// public/components/SlotPicker.js
// Reusable time-slot grid with live remaining capacity badges

export function renderSlotPicker({ slots = [], selectedSlotId = null, onSelectName = 'window.onSlotPick' }) {
  if (!slots.length) {
    return `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-style: italic;">No slots scheduled for this date.</div>`;
  }

  // Sort slots by startHour
  const sorted = [...slots].sort((a, b) => a.startHour - b.startHour);

  return `
    <div class="bu-slot-picker" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 0.75rem;">
      ${sorted.map(s => {
        const remaining = Math.max(0, s.capacity - s.usedCapacity);
        const isFull = remaining === 0;
        const isSelected = s.id === selectedSlotId;

        const bg = isSelected ? 'var(--text-primary)' : isFull ? 'var(--bg-surface)' : 'var(--bg-card)';
        const textCol = isSelected ? '#FFFFFF' : isFull ? 'var(--text-muted)' : 'var(--text-primary)';
        const borderCol = isSelected ? 'var(--text-primary)' : isFull ? 'transparent' : 'var(--border-hairline)';

        return `
          <button
            type="button"
            class="bu-slot-btn"
            ${isFull ? 'disabled' : ''}
            onclick="${onSelectName}('${s.id}')"
            style="
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              padding: 0.85rem 0.5rem; border-radius: 4px; border: 1px solid ${borderCol};
              background: ${bg}; color: ${textCol}; cursor: ${isFull ? 'not-allowed' : 'pointer'};
              transition: all 150ms ease; opacity: ${isFull ? '0.5' : '1'};
            "
          >
            <span style="font-family: var(--font-mono); font-size: 0.95rem; font-weight: 600;">
              ${String(s.startHour).padStart(2, '0')}:00 &ndash; ${String(s.endHour).padStart(2, '0')}:00
            </span>
            <span style="
              margin-top: 0.35rem; font-size: 0.7rem; font-family: var(--font-mono);
              color: ${isSelected ? '#F6F3EC' : isFull ? 'var(--accent)' : 'var(--status-checked)'};
            ">
              ${isFull ? 'FULL' : `${remaining} left`}
            </span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}
