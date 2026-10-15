// public/components/CampusImage.js
// Reads /campus/manifest.json; renders official Bennett photo or bespoke architectural SVG blueprint

let manifestCache = null;

async function getManifest() {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch('/campus/manifest.json');
    manifestCache = await res.json();
  } catch {
    manifestCache = {};
  }
  return manifestCache;
}

export async function renderCampusImage(slotName, customClass = '', aspectRatio = '16/9') {
  const manifest = await getManifest();
  const entry = manifest[slotName];

  if (entry && entry.file) {
    return `
      <div class="bu-campus-img-container ${customClass}" style="position:relative; overflow:hidden; aspect-ratio:${aspectRatio}; border-radius:4px; border:1px solid var(--border-hairline);">
        <img src="/campus/${entry.file}" alt="${entry.alt || slotName}" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;" />
        <div style="position:absolute; bottom:6px; right:8px; font-family:var(--font-mono); font-size:0.65rem; background:rgba(20,20,19,0.7); color:#fff; padding:2px 6px; border-radius:2px;">
          BENNETT UNIV &bull; ${slotName.toUpperCase()}
        </div>
      </div>
    `;
  }

  // Bespoke Architectural SVG Blueprint Illustration
  return `
    <div class="bu-blueprint-container ${customClass}" style="position:relative; overflow:hidden; aspect-ratio:${aspectRatio}; border-radius:4px; border:1px solid var(--border-hairline); background:#1F2421; color:#9BA7A0;">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        <defs>
          <pattern id="grid-${slotName}" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.8"/>
          </pattern>
          <pattern id="grid-large-${slotName}" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#grid-${slotName})"/>
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#161B18"/>
        <rect width="100%" height="100%" fill="url(#grid-large-${slotName})"/>
        
        <!-- Architectural Isometric Projection Lines -->
        <g stroke="#3E4C44" stroke-width="1.2" stroke-dasharray="4,3" fill="none">
          <line x1="20" y1="20" x2="90%" y2="20" />
          <line x1="20" y1="20" x2="20" y2="85%" />
          <line x1="20" y1="85%" x2="90%" y2="85%" />
          <line x1="90%" y1="20" x2="90%" y2="85%" />
          <!-- Cross diagonal crosshair -->
          <line x1="50%" y1="10%" x2="50%" y2="90%" stroke-width="0.5" stroke="#2F3B34" />
          <line x1="10%" y1="50%" x2="90%" y2="50%" stroke-width="0.5" stroke="#2F3B34" />
        </g>

        <!-- Technical Dimension Markers -->
        <text x="32" y="42" font-family="'JetBrains Mono', monospace" font-size="10" fill="#718077" letter-spacing="0.1em">
          BENNETT UNIV ARCHITECTURAL SCHEMATIC // ZONE: ${slotName.toUpperCase()}
        </text>
        <text x="32" y="60" font-family="'JetBrains Mono', monospace" font-size="8" fill="#4E5C54">
          COORD: 28.4503° N, 77.5842° E &bull; ELEV: +198M &bull; SPEC: 1:100 SCALE
        </text>

        <!-- Central Technical Compass / Grid Core -->
        <circle cx="50%" cy="52%" r="36" fill="none" stroke="#2F3B34" stroke-width="1" />
        <circle cx="50%" cy="52%" r="18" fill="none" stroke="#D9381E" stroke-width="1.5" stroke-dasharray="3,2" />
        <text x="50%" y="54%" font-family="'JetBrains Mono', monospace" font-size="9" fill="#D9381E" text-anchor="middle" font-weight="bold">
          [ BU-PULSE ]
        </text>

        <!-- Footer Coordinates -->
        <text x="32" y="82%" font-family="'JetBrains Mono', monospace" font-size="8" fill="#4E5C54">
          STATUS: VERIFIED FACILITY RESOURCE // ATOMIC LOCK ENABLED
        </text>
      </svg>
    </div>
  `;
}
