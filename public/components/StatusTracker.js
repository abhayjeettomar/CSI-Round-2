// public/components/StatusTracker.js
// 5-step food-delivery-style live progress tracker for Laundry and Parcels

export function renderStatusTracker({ stages, currentStatus, statusHistory = [] }) {
  const currentIndex = stages.indexOf(currentStatus);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  return `
    <div class="bu-status-tracker" style="margin: 1.5rem 0; padding: 1.25rem; background: var(--bg-surface); border-radius: 4px; border: 1px solid var(--border-hairline);">
      <div style="display: flex; justify-content: space-between; position: relative; margin-bottom: 0.75rem;">
        <!-- Connecting Line -->
        <div style="position: absolute; top: 14px; left: 24px; right: 24px; height: 2px; background: var(--border-hairline); z-index: 1;"></div>
        <div style="position: absolute; top: 14px; left: 24px; width: ${stages.length > 1 ? (activeIdx / (stages.length - 1)) * 100 : 0}%; height: 2px; background: var(--status-checked); z-index: 2; transition: width 300ms ease;"></div>

        ${stages.map((stage, idx) => {
          const isDone = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          const isPending = idx > activeIdx;

          const dotBg = isDone ? 'var(--status-checked)' : isCurrent ? 'var(--accent)' : 'var(--bg-card)';
          const dotBorder = isDone ? 'var(--status-checked)' : isCurrent ? 'var(--accent)' : 'var(--border-hairline)';
          const textColor = isCurrent ? 'var(--text-primary)' : isDone ? 'var(--status-checked)' : 'var(--text-muted)';
          const fontW = isCurrent ? '700' : '500';

          return `
            <div style="display: flex; flex-direction: column; align-items: center; position: relative; z-index: 3; flex: 1;">
              <div style="
                width: 28px; height: 28px; border-radius: 50%; background: ${dotBg}; border: 2px solid ${dotBorder};
                color: ${isDone || isCurrent ? '#FFFFFF' : 'var(--text-muted)'};
                display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 0.75rem;
                font-weight: 600; box-shadow: ${isCurrent ? '0 0 0 4px rgba(217, 56, 30, 0.2)' : 'none'};
              ">
                ${isDone ? '✓' : idx + 1}
              </div>
              <div style="margin-top: 0.5rem; font-size: 0.75rem; font-weight: ${fontW}; color: ${textColor}; text-align: center;">
                ${stage}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-hairline); font-size: 0.8rem; color: var(--text-muted);">
        <span>Current Status: <strong style="color: var(--text-primary); text-transform: uppercase;">${currentStatus}</strong></span>
        <span style="font-family: var(--font-mono); font-size: 0.75rem;">Real-time SSE sync active</span>
      </div>
    </div>
  `;
}
