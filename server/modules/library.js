// server/modules/library.js
// Library module configuration & business logic rules

export const libraryConfig = {
  id: 'library',
  name: 'Bennett Central Library',
  tagline: 'Quiet reading bays, collaborative glass cubicles, zero ghost seats',
  slotDurationHours: 1,
  openingHour: 8,
  closingHour: 22,
  holdDurationMs: 90000, // 90 seconds hold
  checkInDeadlineMs: 600000, // 10 minutes check-in window
  maxConsecutiveHours: 3,
  maxDailyHoursPerStudent: 4,
  tableCount: 24,
  cubicleCount: 8,
  zones: [
    { id: 'whisper', name: 'Whispering Gallery (T01–T12)', description: 'Quiet individual study with ambient natural light' },
    { id: 'deep-focus', name: 'Quiet Reading Bay (T13–T24)', description: 'Pin-drop silence zone with private carrels and desk power' },
    { id: 'cubicles', name: 'Collaboration Cubicles (C01–C08)', description: 'Glass-enclosed 4-person rooms with HDMI monitors & whiteboards' }
  ]
};
