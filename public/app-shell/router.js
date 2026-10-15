// public/app-shell/router.js
// Fast SPA Router with <250ms opacity/transform transitions

const routes = new Map();
let currentCleanup = null;

export function registerRoute(path, renderFn) {
  routes.set(path, renderFn);
}

export function navigate(path) {
  if (window.location.hash.slice(1) !== path) {
    window.location.hash = path;
  } else {
    handleRouteChange();
  }
}

export async function handleRouteChange() {
  const rawHash = window.location.hash.slice(1) || '/';
  const cleanPath = rawHash.split('?')[0] || '/';
  const viewport = document.getElementById('app-viewport');
  if (!viewport) return;

  // Find matching route or fallback
  let renderFn = routes.get(cleanPath);
  if (!renderFn) {
    // Check prefix routes like /staff/laundry -> /staff
    for (const [key, fn] of routes.entries()) {
      if (key !== '/' && cleanPath.startsWith(key)) {
        renderFn = fn;
        break;
      }
    }
  }

  if (!renderFn) {
    renderFn = routes.get('/') || (() => '<h2>Page Not Found</h2>');
  }

  // Fade out transition
  viewport.classList.add('fade-out');

  setTimeout(async () => {
    if (typeof currentCleanup === 'function') {
      try { currentCleanup(); } catch {}
      currentCleanup = null;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'auto' });

    try {
      const result = await renderFn(viewport, cleanPath);
      if (typeof result === 'function') {
        currentCleanup = result;
      }
    } catch (err) {
      console.error(`[Router error on ${cleanPath}]:`, err);
      viewport.innerHTML = `
        <div class="bu-container">
          <div class="bu-card" style="border-left: 4px solid var(--accent);">
            <h2 style="font-family: var(--font-display); font-size: 1.8rem; margin-bottom: 0.5rem;">Rendering Error</h2>
            <p style="color: var(--text-muted);">${err.message}</p>
          </div>
        </div>
      `;
    }

    // Update active nav links
    document.querySelectorAll('.bu-nav-link, .bu-mobile-item').forEach(link => {
      const href = link.getAttribute('href') || '';
      const linkPath = href.replace(/^#/, '');
      if (linkPath === cleanPath || (linkPath !== '/' && cleanPath.startsWith(linkPath))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Fade in
    viewport.classList.remove('fade-out');
  }, 120);
}

export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  // Default to hash
  if (!window.location.hash) {
    window.location.hash = '/';
  } else {
    handleRouteChange();
  }
}
