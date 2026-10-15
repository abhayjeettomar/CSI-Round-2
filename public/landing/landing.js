// public/landing/landing.js
// Editorial Hero, Live Telemetry Overview, 3-step Run strip, and module directory
// (Spinning gear animation completely eliminated per user directive)

import { store, formatDate } from '../app-shell/store.js';
import { runLiveRaceTestModal } from '../app-shell/shell.js';

export async function renderLanding(container) {
  // Ensure scoped styles are present
  if (!document.getElementById('landing-css')) {
    const link = document.createElement('link');
    link.id = 'landing-css';
    link.rel = 'stylesheet';
    link.href = '/landing/landing.css';
    document.head.appendChild(link);
  }

  function updateView() {
    const today = formatDate();
    const currentHour = new Date().getHours();
    const targetHour = (currentHour >= 8 && currentHour < 22) ? currentHour : 16;

    // Compute live telemetry
    const todayLibSlots = Object.values(store.state.slots).filter(s =>
      s.module === 'library' && s.date === today && s.startHour === targetHour
    );
    const freeLibSeats = todayLibSlots.filter(s => s.usedCapacity === 0).length;
    const totalLibSeats = todayLibSlots.length || 24;

    const todayLaundrySlots = Object.values(store.state.slots).filter(s =>
      s.module === 'laundry' && s.date === today
    );
    const totalBagsFree = todayLaundrySlots.reduce((sum, s) => sum + Math.max(0, s.capacity - s.usedCapacity), 0);

    const courtSlots = Object.values(store.state.slots).filter(s => s.module === 'courts' && s.date === today);
    const courtBooked = courtSlots.reduce((sum, s) => sum + s.usedCapacity, 0);
    const courtTotal = courtSlots.reduce((sum, s) => sum + s.capacity, 0) || 40;

    const parcelWaiting = Object.values(store.state.bookings).filter(b => b.module === 'parcels' && b.status !== 'Collected').length;
    const activeRunsCount = new Set(Object.values(store.state.bookings).filter(b => b.runId).map(b => b.runId)).size;

    container.innerHTML = `
      <!-- Hero Section -->
      <section class="bu-hero-section">
        <div class="bu-container">
          <!-- Live Telemetry Ticker -->
          <div class="bu-hero-ticker">
            <span class="bu-live-dot"></span>
            <span><strong>${freeLibSeats}</strong> library seats free right now</span>
            <span style="color: var(--border-hairline);">&bull;</span>
            <span><strong>${totalBagsFree}</strong> laundry bags open today</span>
            <span style="color: var(--border-hairline);">&bull;</span>
            <span>Quietest library hour: <strong>14:00&ndash;16:00</strong></span>
          </div>

          <h1 class="bu-hero-title">
            Campus Life at the Speed of an Atomic Clock.
          </h1>

          <p class="bu-hero-sub">
            BU PULSE eliminates the Bennett campus scramble. A unified, real-time operating system 
            guaranteeing zero race conditions, 90-second atomic seat holds, and multi-module errand runs.
          </p>

          <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2.5rem;">
            <a href="#/run" class="bu-btn bu-btn-primary" style="padding: 0.85rem 1.75rem; font-size: 1rem;">
              Plan a Campus Run &rarr;
            </a>
            <a href="#/library" class="bu-btn bu-btn-outline" style="padding: 0.85rem 1.75rem; font-size: 1rem;">
              Open Live Floor Plan
            </a>
            <a href="#/database" class="bu-btn bu-btn-outline" style="padding: 0.85rem 1.75rem; font-size: 1rem; border-color: var(--accent); color: var(--accent);">
              Inspect Live Database &rarr;
            </a>
            <button class="bu-btn bu-btn-outline" onclick="window.onTriggerRaceTestHero()" style="border-color: #F87171; color: #991B1B;">
              Audit 30x Mutex Concurrency
            </button>
          </div>

          <!-- Live Campus Operations Telemetry Board -->
          <div class="bu-telemetry-board">
            <div class="bu-telemetry-col">
              <div class="bu-telemetry-header">
                <span class="bu-telemetry-label">CENTRAL LIBRARY</span>
                <span class="bu-badge bu-badge-checked">${freeLibSeats} Seats Available</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">
                East Wing &amp; Whispering Gallery active. 90-second atomic locks ensure zero double-booking.
              </div>
              <a href="#/library" class="bu-telemetry-link">Open Interactive SVG Seat Map &rarr;</a>
            </div>

            <div class="bu-telemetry-col">
              <div class="bu-telemetry-header">
                <span class="bu-telemetry-label">HOSTEL LAUNDRY</span>
                <span class="bu-badge bu-badge-checked">Block C Depot</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">
                2-hour drop windows &bull; 24h wash &amp; iron turnaround &bull; Max 20 bags capacity per slot.
              </div>
              <a href="#/laundry" class="bu-telemetry-link">Book Drop Window &rarr;</a>
            </div>

            <div class="bu-telemetry-col">
              <div class="bu-telemetry-header">
                <span class="bu-telemetry-label">SPORTS ARENA</span>
                <span class="bu-badge bu-badge-checked">${courtTotal - courtBooked} Slots Free</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">
                Badminton BD01&ndash;BD04, basketball courts, and Bennett fitness centre gym passes.
              </div>
              <a href="#/courts" class="bu-telemetry-link">Reserve Court Slot &rarr;</a>
            </div>

            <div class="bu-telemetry-col">
              <div class="bu-telemetry-header">
                <span class="bu-telemetry-label">GATE 2 PARCELS</span>
                <span class="bu-badge bu-badge-held">${parcelWaiting} Awaiting Pickup</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">
                Amazon, BlueDart &amp; Blinkit sorted onto security racks. Contactless QR handover.
              </div>
              <a href="#/parcels" class="bu-telemetry-link">View My Packages &rarr;</a>
            </div>
          </div>
        </div>
      </section>

      <!-- 3-Step "How a Run Works" Strip -->
      <section class="bu-container" style="padding: 3.5rem 0 2rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <span class="bu-page-eyebrow">THE CAMPUS RUN METHODOLOGY</span>
          <h2 style="font-family: var(--font-display); font-size: 2.75rem;">
            One Trip. Three Errands. Zero Friction.
          </h2>
          <p style="color: var(--text-muted); font-size: 1rem; max-width: 580px; margin: 0.5rem auto 0;">
            Bundle your hostel chores between lectures into a single atomic sequence locked by our backend mutex.
          </p>
        </div>

        <div class="bu-step-strip">
          <div class="bu-step-card">
            <div class="bu-step-num">STEP 01</div>
            <h3 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.5rem;">Pick Your Gap Hours</h3>
            <p style="font-size: 0.875rem; color: var(--text-muted);">
              Select your gap between lectures (e.g. 16:00 to 19:00). Check what tasks you need done: laundry drop, study seat, parcel pickup, or gym.
            </p>
          </div>

          <div class="bu-step-card">
            <div class="bu-step-num">STEP 02</div>
            <h3 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.5rem;">Atomic Multi-Module Lock</h3>
            <p style="font-size: 0.875rem; color: var(--text-muted);">
              Our promise-based FIFO engine locks all legs in a single serialized execution pass. If any single slot is sniped mid-click, zero partial bookings occur.
            </p>
          </div>

          <div class="bu-step-card">
            <div class="bu-step-num">STEP 03</div>
            <h3 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 0.5rem;">Scan One Campus Pass QR</h3>
            <p style="font-size: 0.875rem; color: var(--text-muted);">
              Walk through campus with a single deterministic QR matrix. Scan at library turnstiles, Block C laundry depot, and Gate 2 security racks.
            </p>
          </div>
        </div>
      </section>

      <!-- Active Infrastructure Directory -->
      <section class="bu-container" style="border-top: 1px solid var(--border-hairline); padding-top: 3.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.5rem;">
          <div>
            <span class="bu-page-eyebrow">ACTIVE INFRASTRUCTURE DIRECTORY</span>
            <h2 style="font-family: var(--font-display); font-size: 2.5rem;">Campus Service Modules</h2>
          </div>
          <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">5 Modules Live &bull; Real-Time SSE</span>
        </div>

        <div class="bu-module-dir-grid">
          <!-- 1. Laundry -->
          <a href="#/laundry" class="bu-dir-card">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <span class="bu-badge bu-badge-checked">P0 LIVE</span>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">Block C-LG</span>
              </div>
              <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 0.4rem;">Hostel Laundry</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                2-hour drop slots, 20-bag capacity limits, 24h/12h/36h turnaround, and 5-stage live status tracking.
              </p>
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent); font-weight: 600;">
              Open Laundry Depot &rarr;
            </div>
          </a>

          <!-- 2. Library -->
          <a href="#/library" class="bu-dir-card">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <span class="bu-badge bu-badge-checked">P0 LIVE</span>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">Core Block</span>
              </div>
              <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 0.4rem;">Central Library</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                Interactive SVG floor plan, 90-second atomic seat holds, group cubicle member validation, and 10m no-show release.
              </p>
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent); font-weight: 600;">
              Open Live Seat Map &rarr;
            </div>
          </a>

          <!-- 3. Courts -->
          <a href="#/courts" class="bu-dir-card">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <span class="bu-badge bu-badge-checked">P1 LIVE</span>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">Athletics Arena</span>
              </div>
              <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 0.4rem;">Sports Complex &amp; Gym</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                Badminton BD01&ndash;BD04, basketball courts, astroturf pitch, and Bennett Fitness Centre slot booking.
              </p>
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent); font-weight: 600;">
              Book Sports Slot &rarr;
            </div>
          </a>

          <!-- 4. Parcels -->
          <a href="#/parcels" class="bu-dir-card">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <span class="bu-badge bu-badge-checked">P1 LIVE</span>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">Hostel Gate 2</span>
              </div>
              <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 0.4rem;">Gate 2 Parcel Depot</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                Inbound package intake tracker, courier racks, and contactless Digital Campus Pass QR handover.
              </p>
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent); font-weight: 600;">
              Check Parcel Arrivals &rarr;
            </div>
          </a>

          <!-- 5. Room & Hall Booking -->
          <a href="#/rooms" class="bu-dir-card">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <span class="bu-badge bu-badge-checked">P2 LIVE</span>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">Academic Blocks</span>
              </div>
              <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 0.4rem;">Club Rooms &amp; Halls</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                Student society venue reservations for hackathons, workshops, and student meetings with 1-tap staff approvals.
              </p>
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent); font-weight: 600;">
              Reserve Venue &rarr;
            </div>
          </a>

          <!-- 6. Database Backoffice -->
          <a href="#/database" class="bu-dir-card" style="border: 2px solid var(--accent); background: #FAF8F4;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <span class="bu-badge" style="background: var(--accent); color: #FFFFFF;">BACKOFFICE</span>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent); font-weight: 700;">LIVE DB</span>
              </div>
              <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 0.4rem;">System Database</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                Audit all bookings across all modules, inspect active 90s holds, view capacity metrics, and export raw data.
              </p>
            </div>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent); font-weight: 700;">
              Open Database Console &rarr;
            </div>
          </a>
        </div>
      </section>

      <!-- Editorial Footer -->
      <footer style="border-top: 1px solid var(--border-hairline); margin-top: 5rem; padding: 3rem 0; background: var(--bg-surface);">
        <div class="bu-container" style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-family: var(--font-display); font-size: 1.5rem; font-weight: normal;">BU PULSE</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
              Bennett University, Greater Noida &bull; Unified Campus Operations Platform
            </div>
          </div>

          <div style="display: flex; gap: 1.5rem; font-family: var(--font-mono); font-size: 0.75rem;">
            <a href="#/database" style="color: var(--accent); font-weight: 700;">Database Console</a>
            <button onclick="window.onTriggerRaceTestHero()" style="color: var(--accent); text-decoration: underline;">
              Audit Concurrency Proof (30x Mutex)
            </button>
            <span style="color: var(--text-muted);">Bennett University &bull; Greater Noida</span>
          </div>
        </div>
      </footer>
    `;
  }

  window.onTriggerRaceTestHero = () => {
    runLiveRaceTestModal();
  };

  updateView();
  return store.subscribe(updateView);
}
