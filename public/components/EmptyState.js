// public/components/EmptyState.js
// Custom SVG line-art empty state with student-voice copy

export function renderEmptyState({
  title = 'No active bookings found',
  subtitle = 'Your schedule is currently clear. No laundry loads, library seats, or parcels waiting.',
  actionLabel = '',
  actionUrl = ''
}) {
  return `
    <div class="bu-empty-state" style="text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-surface); border: 1px dashed var(--border-hairline); border-radius: 4px;">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.2" style="margin: 0 auto 1.25rem; display: block; opacity: 0.7;">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <path d="M8 14h.01"/>
        <path d="M12 14h.01"/>
        <path d="M16 14h.01"/>
        <path d="M8 18h.01"/>
        <path d="M12 18h.01"/>
      </svg>
      <h3 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: normal; margin-bottom: 0.4rem; color: var(--text-primary);">
        ${title}
      </h3>
      <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 440px; margin: 0 auto 1.5rem;">
        ${subtitle}
      </p>
      ${actionLabel ? `
        <a href="${actionUrl}" class="bu-btn bu-btn-primary bu-btn-sm" style="display: inline-flex;">
          ${actionLabel}
        </a>
      ` : ''}
    </div>
  `;
}
