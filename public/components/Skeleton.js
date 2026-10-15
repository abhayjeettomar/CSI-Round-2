// public/components/Skeleton.js
// Editorial shimmer placeholder component

export function renderSkeleton({ count = 3, height = '48px', style = '' }) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="bu-skeleton" style="
        height: ${height};
        background: linear-gradient(90deg, #EFECE4 25%, #E6E1D6 50%, #EFECE4 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
        margin-bottom: 0.75rem;
        ${style}
      "></div>
    `;
  }
  return `
    <style>
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    </style>
    <div>${html}</div>
  `;
}
