// All static/mock data lives here. Swap these out for API calls later.
import {
  Sport, Venue, Slot, Booking, Review, Coupon, Payout, Dispute,
  AppNotification, User,
} from '../types';

export const SPORTS: Sport[] = [
  { id: 's1', name: 'Football', icon: '⚽' },
  { id: 's2', name: 'Cricket', icon: '🏏' },
  { id: 's3', name: 'Badminton', icon: '🏸' },
  { id: 's4', name: 'Tennis', icon: '🎾' },
  { id: 's5', name: 'Basketball', icon: '🏀' },
  { id: 's6', name: 'Volleyball', icon: '🏐' },
];

const PHOTO = (seed: string) =>
  `https://picsum.photos/seed/${seed}/800/500`;

export const VENUES: Venue[] = [
  {
    id: 'v1',
    ownerId: 'o1',
    name: 'Green Turf Arena',
    address: 'Gangapur Road, Nashik',
    city: 'Nashik',
    description:
      'Premium FIFA-standard artificial turf with floodlights and clean facilities. Ideal for 5-a-side and 7-a-side football.',
    status: 'live',
    rating: 4.6,
    reviewCount: 128,
    distanceKm: 2.4,
    pricePerSlot: 900,
    coverPhoto: PHOTO('turf1'),
    photos: [PHOTO('turf1'), PHOTO('turf1b'), PHOTO('turf1c')],
    sports: ['s1', 's5'],
    amenities: ['Parking', 'Floodlights', 'Washroom', 'Drinking Water'],
    lat: 19.9975,
    lng: 73.7898,
    courts: [
      { id: 'c1', name: 'Court A', sportId: 's1', type: 'Artificial Turf', pricePerSlot: 900, peakPrice: 1200 },
      { id: 'c2', name: 'Court B', sportId: 's1', type: 'Artificial Turf', pricePerSlot: 900, peakPrice: 1200 },
    ],
  },
  {
    id: 'v2',
    ownerId: 'o1',
    name: 'Smash Badminton Club',
    address: 'College Road, Nashik',
    city: 'Nashik',
    description:
      'Indoor wooden courts with professional lighting. 6 courts available with equipment rental.',
    status: 'live',
    rating: 4.8,
    reviewCount: 96,
    distanceKm: 3.8,
    pricePerSlot: 400,
    coverPhoto: PHOTO('badminton1'),
    photos: [PHOTO('badminton1'), PHOTO('badminton1b')],
    sports: ['s3'],
    amenities: ['Parking', 'AC', 'Washroom', 'Equipment Rental'],
    lat: 20.0059,
    lng: 73.7749,
    courts: [
      { id: 'c3', name: 'Court 1', sportId: 's3', type: 'Wooden', pricePerSlot: 400, peakPrice: 550 },
      { id: 'c4', name: 'Court 2', sportId: 's3', type: 'Wooden', pricePerSlot: 400, peakPrice: 550 },
    ],
  },
  {
    id: 'v3',
    ownerId: 'o2',
    name: 'Boundary Cricket Ground',
    address: 'Trimbak Road, Nashik',
    city: 'Nashik',
    description:
      'Full-size cricket ground with practice nets and natural grass. Perfect for matches and net practice.',
    status: 'live',
    rating: 4.3,
    reviewCount: 64,
    distanceKm: 5.1,
    pricePerSlot: 1500,
    coverPhoto: PHOTO('cricket1'),
    photos: [PHOTO('cricket1'), PHOTO('cricket1b')],
    sports: ['s2'],
    amenities: ['Parking', 'Floodlights', 'Cafeteria', 'First Aid'],
    lat: 19.9820,
    lng: 73.7560,
    courts: [
      { id: 'c5', name: 'Main Ground', sportId: 's2', type: 'Natural Grass', pricePerSlot: 1500, peakPrice: 2000 },
    ],
  },
  {
    id: 'v4',
    ownerId: 'o2',
    name: 'Ace Tennis Courts',
    address: 'Indira Nagar, Nashik',
    city: 'Nashik',
    description:
      'Two synthetic tennis courts with night play option. Coaching available on request.',
    status: 'live',
    rating: 4.5,
    reviewCount: 41,
    distanceKm: 1.9,
    pricePerSlot: 600,
    coverPhoto: PHOTO('tennis1'),
    photos: [PHOTO('tennis1'), PHOTO('tennis1b')],
    sports: ['s4'],
    amenities: ['Parking', 'Floodlights', 'Washroom'],
    lat: 20.0110,
    lng: 73.7980,
    courts: [
      { id: 'c6', name: 'Court 1', sportId: 's4', type: 'Synthetic', pricePerSlot: 600, peakPrice: 800 },
    ],
  },
];

// Pending venue for admin approval demo
export const PENDING_VENUES: Venue[] = [
  {
    ...VENUES[0],
    id: 'vp1',
    name: 'Champions Sports Complex',
    status: 'pending',
    rating: 0,
    reviewCount: 0,
    coverPhoto: PHOTO('pending1'),
  },
];

function buildSlots(courtId: string, basePrice: number): Slot[] {
  const times = [
    ['06:00', '07:00'], ['07:00', '08:00'], ['08:00', '09:00'],
    ['16:00', '17:00'], ['17:00', '18:00'], ['18:00', '19:00'],
    ['19:00', '20:00'], ['20:00', '21:00'], ['21:00', '22:00'],
  ];
  const statuses: Array<'available' | 'booked' | 'blocked'> = [
    'available', 'booked', 'available', 'available', 'booked',
    'available', 'available', 'blocked', 'available',
  ];
  return times.map((t, i) => ({
    id: `${courtId}-slot-${i}`,
    courtId,
    date: '2026-06-02',
    startTime: t[0],
    endTime: t[1],
    status: statuses[i],
    price: i >= 4 ? Math.round(basePrice * 1.3) : basePrice,
  }));
}

export const SLOTS: Record<string, Slot[]> = {
  c1: buildSlots('c1', 900),
  c2: buildSlots('c2', 900),
  c3: buildSlots('c3', 400),
  c5: buildSlots('c5', 1500),
  c6: buildSlots('c6', 600),
};

export const BOOKINGS: Booking[] = [
  {
    id: 'b1', playerId: 'p1', playerName: 'Rohan Sharma',
    venueId: 'v1', venueName: 'Green Turf Arena', venuePhoto: PHOTO('turf1'),
    sport: 'Football', courtName: 'Court A', date: '2026-06-05',
    startTime: '18:00', endTime: '19:00', amount: 1220, commission: 120,
    status: 'confirmed', paymentStatus: 'success',
  },
  {
    id: 'b2', playerId: 'p1', playerName: 'Rohan Sharma',
    venueId: 'v2', venueName: 'Smash Badminton Club', venuePhoto: PHOTO('badminton1'),
    sport: 'Badminton', courtName: 'Court 1', date: '2026-06-08',
    startTime: '20:00', endTime: '21:00', amount: 420, commission: 42,
    status: 'confirmed', paymentStatus: 'success',
  },
  {
    id: 'b3', playerId: 'p1', playerName: 'Rohan Sharma',
    venueId: 'v3', venueName: 'Boundary Cricket Ground', venuePhoto: PHOTO('cricket1'),
    sport: 'Cricket', courtName: 'Main Ground', date: '2026-05-20',
    startTime: '07:00', endTime: '08:00', amount: 1520, commission: 150,
    status: 'completed', paymentStatus: 'success', hasReview: false,
  },
  {
    id: 'b4', playerId: 'p1', playerName: 'Rohan Sharma',
    venueId: 'v4', venueName: 'Ace Tennis Courts', venuePhoto: PHOTO('tennis1'),
    sport: 'Tennis', courtName: 'Court 1', date: '2026-05-15',
    startTime: '17:00', endTime: '18:00', amount: 620, commission: 60,
    status: 'cancelled', paymentStatus: 'refunded',
  },
  {
    id: 'b5', playerId: 'p2', playerName: 'Aarti Patil',
    venueId: 'v1', venueName: 'Green Turf Arena', venuePhoto: PHOTO('turf1'),
    sport: 'Football', courtName: 'Court B', date: '2026-06-05',
    startTime: '19:00', endTime: '20:00', amount: 1220, commission: 120,
    status: 'confirmed', paymentStatus: 'success',
  },
];

export const REVIEWS: Review[] = [
  {
    id: 'r1', bookingId: 'b3', playerName: 'Vikram Joshi',
    venueId: 'v1', rating: 5, comment: 'Excellent turf quality and well maintained. Floodlights are great for night games.',
    cleanliness: 5, ground: 5, staff: 4, date: '2026-05-18',
  },
  {
    id: 'r2', bookingId: 'b4', playerName: 'Sneha Kulkarni',
    venueId: 'v1', rating: 4, comment: 'Good experience overall. Parking can get crowded on weekends.',
    cleanliness: 4, ground: 5, staff: 4, date: '2026-05-10',
    ownerReply: 'Thank you! We are working on expanding parking.',
  },
  {
    id: 'r3', bookingId: 'b2', playerName: 'Amit Desai',
    venueId: 'v1', rating: 2, comment: 'Booking was double-booked, had to wait 20 minutes.',
    cleanliness: 3, ground: 4, staff: 2, date: '2026-05-05',
  },
];

export const COUPONS: Coupon[] = [
  {
    id: 'cp1', code: 'TURF20', discountType: 'percent', discountValue: 20,
    minBooking: 500, maxDiscount: 300, validUntil: '2026-07-31',
    usedCount: 142, maxUses: 500, isActive: true,
  },
  {
    id: 'cp2', code: 'FIRST100', discountType: 'flat', discountValue: 100,
    minBooking: 400, validUntil: '2026-06-30',
    usedCount: 89, maxUses: 200, isActive: true,
  },
  {
    id: 'cp3', code: 'WEEKEND15', discountType: 'percent', discountValue: 15,
    minBooking: 800, maxDiscount: 250, validUntil: '2026-05-01',
    usedCount: 200, maxUses: 200, isActive: false,
  },
];

export const PAYOUTS: Payout[] = [
  {
    id: 'po1', ownerId: 'o1', ownerName: 'Green Sports Pvt Ltd',
    amount: 18400, commissionDeducted: 1840, netAmount: 16560,
    status: 'pending', date: '2026-05-29',
  },
  {
    id: 'po2', ownerId: 'o2', ownerName: 'Boundary Ventures',
    amount: 12000, commissionDeducted: 1200, netAmount: 10800,
    status: 'settled', date: '2026-05-22',
  },
  {
    id: 'po3', ownerId: 'o1', ownerName: 'Green Sports Pvt Ltd',
    amount: 8600, commissionDeducted: 860, netAmount: 7740,
    status: 'failed', date: '2026-05-15',
  },
];

export const DISPUTES: Dispute[] = [
  {
    id: 'd1', bookingId: 'b5', playerName: 'Aarti Patil', ownerName: 'Green Sports Pvt Ltd',
    venueName: 'Green Turf Arena', issue: 'Turf was waterlogged and unplayable but no refund offered.',
    status: 'open', date: '2026-05-28',
  },
  {
    id: 'd2', bookingId: 'b4', playerName: 'Rohan Sharma', ownerName: 'Boundary Ventures',
    venueName: 'Ace Tennis Courts', issue: 'Charged peak price for an off-peak slot.',
    status: 'resolved', date: '2026-05-12',
  },
];

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1', title: 'Booking Confirmed',
    body: 'Your booking at Green Turf Arena on Jun 5, 6:00 PM is confirmed!',
    type: 'booking', date: '2 hours ago', isRead: false,
  },
  {
    id: 'n2', title: 'Get 20% Off!',
    body: 'Use code TURF20 on your next booking. Valid till July 31.',
    type: 'offer', date: '1 day ago', isRead: false,
  },
  {
    id: 'n3', title: 'How was your game?',
    body: 'Rate your experience at Boundary Cricket Ground.',
    type: 'review', date: '3 days ago', isRead: true,
  },
  {
    id: 'n4', title: 'Refund Processed',
    body: '₹620 has been refunded to your account.',
    type: 'payment', date: '5 days ago', isRead: true,
  },
];

export const CURRENT_USERS: Record<string, User> = {
  player: {
    id: 'p1', name: 'Rohan Sharma', email: 'rohan@example.com',
    phone: '+91 98765 43210', role: 'player',
    avatar: 'https://i.pravatar.cc/150?img=12',
    preferredSports: ['s1', 's3'], totalBookings: 24, isPremium: true,
  },
  owner: {
    id: 'o1', name: 'Green Sports Pvt Ltd', email: 'owner@greensports.com',
    phone: '+91 99887 76655', role: 'owner',
    avatar: 'https://i.pravatar.cc/150?img=33',
  },
  admin: {
    id: 'a1', name: 'Platform Admin', email: 'admin@turfbook.com',
    phone: '+91 90000 00000', role: 'admin',
    avatar: 'https://i.pravatar.cc/150?img=68',
  },
};

export const ADMIN_KPIS = {
  bookingsToday: 47,
  revenueToday: 12840,
  newUsers: 23,
  activeVenues: 18,
  pendingApprovals: 1,
  openDisputes: 1,
};

export const OWNER_STATS = {
  todayBookings: 8,
  todayRevenue: 6400,
  weekRevenue: 38200,
  monthRevenue: 142800,
  pendingPayout: 16560,
};

export function getSportName(id: string): string {
  return SPORTS.find((s) => s.id === id)?.name ?? id;
}
export function getSportIcon(id: string): string {
  return SPORTS.find((s) => s.id === id)?.icon ?? '🎯';
}
