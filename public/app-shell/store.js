// public/app-shell/store.js
// Reactive client store updated exclusively by API responses + SSE events

export function formatDate(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const store = {
  state: {
    resources: {},
    slots: {},
    holds: {},
    bookings: {},
    users: [],
    settings: { crowdSim: false },
    currentUser: null,
    serverTime: Date.now()
  },
  listeners: new Set(),

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  notify() {
    for (const fn of this.listeners) {
      try {
        fn(this.state);
      } catch (err) {
        console.error('[store listener error]:', err);
      }
    }
  },

  async init() {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Failed to load initial state');
      const data = await res.json();

      this.state.resources = data.resources || {};
      this.state.slots = data.slots || {};
      this.state.holds = data.holds || {};
      this.state.bookings = data.bookings || {};
      this.state.users = data.users || [];
      this.state.settings = data.settings || {};
      this.state.serverTime = data.serverTime || Date.now();

      // Load or set default persona (Aarav Sharma)
      const savedUser = localStorage.getItem('bu_pulse_persona');
      if (savedUser) {
        try {
          this.state.currentUser = JSON.parse(savedUser);
        } catch {}
      }
      if (!this.state.currentUser) {
        const defaultAarav = this.state.users.find(u => u.id === 'E22CSEU0123') || {
          id: 'E22CSEU0123',
          name: 'Aarav Sharma',
          role: 'student',
          hostel: 'C5',
          room: '402'
        };
        this.setCurrentUser(defaultAarav);
      }

      this.notify();
    } catch (err) {
      console.error('[store.init error]:', err);
    }
  },

  patch(patchData) {
    if (patchData.slots) Object.assign(this.state.slots, patchData.slots);
    if (patchData.holds) this.state.holds = patchData.holds;
    if (patchData.bookings) {
      if (patchData.isReset) {
        this.state.bookings = patchData.bookings;
      } else {
        Object.assign(this.state.bookings, patchData.bookings);
      }
    }
    if (patchData.settings) Object.assign(this.state.settings, patchData.settings);
    this.notify();
  },

  setCurrentUser(user) {
    this.state.currentUser = user;
    localStorage.setItem('bu_pulse_persona', JSON.stringify(user));
    this.notify();
  },

  getCurrentUser() {
    return this.state.currentUser;
  }
};
