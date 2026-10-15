// server/modules/parcels.js
// Hostel Gate Parcels configuration & rules

export const parcelsConfig = {
  id: 'parcels',
  name: 'Hostel Gate 2 Parcel Depot',
  tagline: 'Instant pickup tags, organized rack sorting, no lost packages',
  resourceId: 'PAR-GATE2',
  slotDurationHours: 2,
  couriers: ['BlueDart', 'Delhivery', 'Amazon', 'Blinkit', 'DTDC', 'India Post'],
  racks: ['Gate 2 Rack A', 'Gate 2 Rack B', 'Gate 2 Rack C', 'Gate 2 Rack D'],
  stages: ['Arrived', 'Ready at Gate', 'Collected']
};
