// server/modules/rooms.js
// Club Rooms & Seminar Halls configuration & rules

export const roomsConfig = {
  id: 'rooms',
  name: 'Club Rooms & Venues',
  tagline: 'Book hackathon war-rooms, robotics workshops, and seminar halls',
  slotDurationHours: 1,
  openingHour: 8,
  closingHour: 22,
  resources: [
    { id: 'RM-CR101', name: 'Coding Club Pod (CR-101)', capacity: 15, autoApprove: true, meta: { floor: 'Tech Wing 1st Floor', projector: true } },
    { id: 'RM-CR102', name: 'Robotics Bay (CR-102)', capacity: 20, autoApprove: true, meta: { floor: 'Innovation Hub GF', has3dPrinter: true } },
    { id: 'RM-SH201', name: 'Main Seminar Hall (SH-201)', capacity: 150, autoApprove: false, meta: { floor: 'Core Block 2nd Floor', audioVisual: true } },
    { id: 'RM-AMP01', name: 'Student Amphitheatre (AMP-01)', capacity: 250, autoApprove: false, meta: { location: 'Central Lawn', acousticStage: true } }
  ]
};
