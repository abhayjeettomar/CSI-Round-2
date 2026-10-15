// server/modules/laundry.js
// Laundry module configuration & business logic rules

export const laundryConfig = {
  id: 'laundry',
  name: 'Central Laundry Depot',
  tagline: 'Crisp formals & clean daily wear without the hostel bin sprint',
  resourceId: 'LAU-DROP',
  slotDurationHours: 2,
  windowCapacity: 20, // 20 bags per 2h slot
  maxBagsPerBooking: 3,
  minBagsPerBooking: 1,
  maxItemsPerBooking: 40,
  maxActiveOrdersPerStudent: 2,
  services: [
    { id: 'wash', name: 'Standard Wash & Dry', turnaroundHours: 24, badge: '24h Turnaround' },
    { id: 'iron', name: 'Press & Iron Only', turnaroundHours: 12, badge: '12h Turnaround' },
    { id: 'wash+iron', name: 'Complete Wash + Iron', turnaroundHours: 36, badge: '36h Turnaround' }
  ],
  stages: ['Dropped', 'Washing', 'Ironing', 'Ready', 'Collected'],
  hostelBlocks: [
    'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12',
    'D1', 'D2', 'D3', 'D4', 'D5', 'D6'
  ]
};

/**
 * Calculates earliest eligible pickup slot date & hour based on drop end hour & turnaround
 */
export function calculateEarliestPickup(dropDateStr, dropEndHour, serviceType = 'wash+iron') {
  const service = laundryConfig.services.find(s => s.id === serviceType) || laundryConfig.services[2];
  const turnaroundMs = service.turnaroundHours * 3600 * 1000;

  const dropDate = new Date(`${dropDateStr}T${String(dropEndHour).padStart(2, '0')}:00:00`);
  const pickupTime = new Date(dropDate.getTime() + turnaroundMs);

  const pickupDateStr = pickupTime.toISOString().split('T')[0];
  let pickupHour = pickupTime.getHours();

  // Round up to nearest even hour between 08:00 and 20:00
  if (pickupHour < 8) pickupHour = 8;
  if (pickupHour > 20) {
    // Next day 08:00
    pickupTime.setDate(pickupTime.getDate() + 1);
    return {
      date: pickupTime.toISOString().split('T')[0],
      startHour: 8,
      endHour: 10
    };
  }

  const roundedStart = pickupHour % 2 === 0 ? pickupHour : pickupHour + 1;
  return {
    date: pickupDateStr,
    startHour: Math.min(20, roundedStart),
    endHour: Math.min(22, roundedStart + 2)
  };
}
