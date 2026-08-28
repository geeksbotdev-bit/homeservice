import type { BookingStatus } from '../components/StatusBadge';

export type { BookingStatus };

export interface AddOn {
  id: string;
  name: string;
  desc: string;
  price: number;
}

export interface Service {
  id: string;
  name: string;
  tagline: string;
  category: string;           // e.g. "QUICK" | "POPULAR" | "FULL HOME"
  categoryColor: string;
  categoryBg: string;
  basePrice: number;
  unitLabel: string;          // "per bathroom"
  duration: string;           // "1–2 hrs"
  rating: number;
  reviews: number;
  icon: string;               // MaterialCommunityIcons name
  gradient: [string, string];
  description: string;
  included: string[];
  addOns: AddOn[];
  unitNoun: string;           // "bathroom"
}

export interface Cleaner {
  id: string;
  name: string;
  initials: string;
  rating: number;
  jobs: number;
  distanceKm: number;
  bio?: string;
  preferred?: boolean;
  available?: boolean;
  phone?: string;
  lat?: number;   // live map position (from the API)
  lng?: number;
  live?: boolean; // true if the cleaner reported a real GPS fix recently
  verifStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verified?: boolean;
  verifNote?: string;
}

export interface Booking {
  id: string;
  service: string;
  addOns: string[];
  status: BookingStatus;
  scheduledType: 'now' | 'later';
  dateLabel: string;
  timeLabel: string;
  address: string;
  total: number;
  cleaner?: Cleaner;
  accepted?: boolean;         // cleaner accepted the job request
  rating?: number;            // client's rating after completion
  invoiceNo?: string;
  payment?: { method: string; txnId: string; amount: number; status: string; refundAmount?: number };
  custLat?: number;
  custLng?: number;
  proLat?: number;
  proLng?: number;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  fromMe: boolean;
  senderRole?: 'client' | 'cleaner';
  text: string;
  time: string;
  read?: boolean;
}

export interface Conversation {
  bookingId: string;
  name: string;       // the OTHER party (cleaner for customer, customer for cleaner)
  initials: string;
  online?: boolean;
  cleaner: Cleaner;
  lastMessage: string;
  lastTime: string;
  unread: number;
  serviceName: string;
}

export interface AppNotification {
  id: string;
  icon: string;          // Feather icon name
  title: string;
  body: string;
  read: boolean;
  time: string;          // relative label e.g. "Yesterday"
}

export type Role = 'client' | 'professional' | 'pro';

export interface User {
  name: string;
  phone: string;
  email?: string;
  location: string;
  role?: Role;
  avatarUrl?: string;
  gender?: string;
  dob?: string;
  addresses: Address[];
  paymentMethods: PaymentMethod[];
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  area: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'bank' | 'easypaisa' | 'jazzcash' | 'card';
  name: string;
  detail: string;
  isDefault?: boolean;
}
