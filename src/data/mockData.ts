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

const mockCourt = (
  id: string, name: string, sportId: string, type: string,
  pricePerHour: number, peakPrice: number
) => ({
  id, name, sportId, type,
  pricePerHour,
  peakPrice,
  openTime: null,
  closeTime: null,
  slotDurationMins: 60,
  isActive: true,
  effectivePricePerHour: pricePerHour,
  effectiveOpenTime: '05:00',
  effectiveCloseTime: '23:00',
});

export const VENUES: Venue[] = [
  {
    id: 'v1',
    ownerId: 'o1',
    name: 'Green Turf Arena',
    address: 'Gangapur Road, Nashik',
    city: 'Nashik',
    state: 'Maharashtra',
    pincode: '422005',
    description:
      'Premium FIFA-standard artificial turf with floodlights and clean facilities. Ideal for 5-a-side and 7-a-side football.',
    contactPhone: '9876543210',
    contactEmail: 'greenturf@example.com',
    openTime: '05:00',
    closeTime: '23:00',
    status: 'live',
    rating: 4.6,
    reviewCount: 128,
    distanceKm: 2.4,
    pricePerHour: 900,
    coverPhoto: PHOTO('turf1'),
    photos: [PHOTO('turf1'), PHOTO('turf1b'), PHOTO('turf1c')],
    sports: ['s1', 's5'],
    amenities: ['Parking', 'Floodlights', 'Washroom', 'Drinking Water'],
    isActive: true,
    lat: 19.9975,
    lng: 73.7898,
    courts: [
      mockCourt('c1', 'Court A', 's1', 'Artificial Turf', 900, 1200),
      mockCourt('c2', 'Court B', 's1', 'Artificial Turf', 900, 1200),
    ],
  },
  {
    id: 'v2',
    ownerId: 'o1',
    name: 'Smash Badminton Club',
    address: 'College Road, Nashik',
    city: 'Nashik',
    state: 'Maharashtra',
    pincode: '422005',
    description:
      'Indoor wooden courts with professional lighting. 6 courts available with equipment rental.',
    contactPhone: '9876543211',
    contactEmail: '',
    openTime: '06:00',
    closeTime: '22:00',
    status: 'live',
    rating: 4.8,
    reviewCount: 96,
    distanceKm: 3.8,
    pricePerHour: 400,
    coverPhoto: PHOTO('badminton1'),
    photos: [PHOTO('badminton1'), PHOTO('badminton1b')],
    sports: ['s3'],
    amenities: ['Parking', 'AC', 'Washroom', 'Equipment Rental'],
    isActive: true,
    lat: 20.0059,
    lng: 73.7749,
    courts: [
      mockCourt('c3', 'Court 1', 's3', 'Wooden', 400, 550),
      mockCourt('c4', 'Court 2', 's3', 'Wooden', 400, 550),
    ],
  },
  {
    id: 'v3',
    ownerId: 'o2',
    name: 'Boundary Cricket Ground',
    address: 'Trimbak Road, Nashik',
    city: 'Nashik',
    state: 'Maharashtra',
    pincode: '422212',
    description:
      'Full-size cricket ground with practice nets and natural grass. Perfect for matches and net practice.',
    contactPhone: '9876543212',
    contactEmail: '',
    openTime: '05:00',
    closeTime: '23:00',
    status: 'live',
    rating: 4.3,
    reviewCount: 64,
    distanceKm: 5.1,
    pricePerHour: 1500,
    coverPhoto: PHOTO('cricket1'),
    photos: [PHOTO('cricket1'), PHOTO('cricket1b')],
    sports: ['s2'],
    amenities: ['Parking', 'Floodlights', 'Cafeteria', 'First Aid'],
    isActive: true,
    lat: 19.9820,
    lng: 73.7560,
    courts: [
      mockCourt('c5', 'Main Ground', 's2', 'Natural Grass', 1500, 2000),
    ],
  },
  {
    id: 'v4',
    ownerId: 'o2',
    name: 'Ace Tennis Courts',
    address: 'Indira Nagar, Nashik',
    city: 'Nashik',
    state: 'Maharashtra',
    pincode: '422009',
    description:
      'Two synthetic tennis courts with night play option. Coaching available on request.',
    contactPhone: '9876543213',
    contactEmail: '',
    openTime: '06:00',
    closeTime: '21:00',
    status: 'live',
    rating: 4.5,
    reviewCount: 41,
    distanceKm: 1.9,
    pricePerHour: 600,
    coverPhoto: PHOTO('tennis1'),
    photos: [PHOTO('tennis1'), PHOTO('tennis1b')],
    sports: ['s4'],
    amenities: ['Parking', 'Floodlights', 'Washroom'],
    isActive: true,
    lat: 20.0110,
    lng: 73.7980,
    courts: [
      mockCourt('c6', 'Court 1', 's4', 'Synthetic', 600, 800),
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

export const CURRENT_USERS: Record<string, User> = {
  player: {
    id: 'demo-player',
    name: 'Demo Player',
    email: 'player@demo.com',
    phone: '9999999990',
    role: 'player',
    totalBookings: 5,
    isPremium: false,
  },
  owner: {
    id: 'demo-owner',
    name: 'Demo Owner',
    email: 'owner@demo.com',
    phone: '9999999991',
    role: 'owner',
    totalBookings: 0,
    isPremium: false,
  },
  admin: {
    id: 'demo-admin',
    name: 'Demo Admin',
    email: 'admin@demo.com',
    phone: '9999999992',
    role: 'admin',
    totalBookings: 0,
    isPremium: false,
  },
};
