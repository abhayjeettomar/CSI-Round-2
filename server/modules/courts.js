// server/modules/courts.js
// Sports Courts & Gym module configuration & rules

export const courtsConfig = {
  id: 'courts',
  name: 'Sports Complex & Fitness Centre',
  tagline: 'Floodlit badminton courts, synthetic turf, and heavy iron',
  slotDurationHours: 1,
  openingHour: 8,
  closingHour: 22,
  maxDailyBookingsPerStudent: 1,
  resources: [
    { id: 'CRT-BD01', name: 'Badminton Court 01', sport: 'Badminton', capacity: 4, surface: 'Indoor Synthetic' },
    { id: 'CRT-BD02', name: 'Badminton Court 02', sport: 'Badminton', capacity: 4, surface: 'Indoor Synthetic' },
    { id: 'CRT-BD03', name: 'Badminton Court 03', sport: 'Badminton', capacity: 4, surface: 'Indoor Synthetic' },
    { id: 'CRT-BD04', name: 'Badminton Court 04', sport: 'Badminton', capacity: 4, surface: 'Indoor Synthetic' },
    { id: 'CRT-BB01', name: 'Main Basketball Arena', sport: 'Basketball', capacity: 10, surface: 'Acrylic Turf' },
    { id: 'CRT-FB01', name: 'Football Turf Pitch', sport: 'Football', capacity: 22, surface: 'AstroTurf Pitch' },
    { id: 'CRT-GYM01', name: 'Bennett Fitness Centre', sport: 'Gym', capacity: 25, surface: 'Hammer Strength & Cardio' }
  ]
};
