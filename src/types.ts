/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'Tea & Kehwa' | 'Chat Pata Paratha' | 'Meetha Paratha' | 'Juices & Drinks' | 'Fresh Juices' | 'Milk Shakes' | 'Dry Fruit Shakes';

export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  description: string;
  price: number;
  image?: string;
  isAvailable?: boolean;
  views?: number;
  variants?: {
    name: string;
    price: number;
  }[];
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'customer' | 'staff' | 'admin';
  loyaltyPoints: number;
  phone?: string;
  address?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: {
    menuItemId: string;
    quantity: number;
    price: number;
    variant?: string;
  }[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'on-the-way' | 'delivering' | 'delivered' | 'cancelled';
  createdAt: number;
  deliveryAddress: string;
  geolocation?: {
    lat: number;
    lng: number;
  };
}

export interface Poetry {
  id: string;
  title: string;
  author: string;
  text: string;
}

export interface AdminPermissions {
  viewAnalytics: boolean;
  manageMenu: boolean;
  viewOrders: boolean;
  manageOrders: boolean;
  viewUsers: boolean;
  manageSettings: boolean;
  accessRescueVault: boolean;
  accessMasterCore: boolean;
  manageComms: boolean;
  // Consolidated flags for new permission model
  canEditMenu?: boolean;
  canProcessOrders?: boolean;
  canManageUsers?: boolean;
  canViewLogs?: boolean;
  canAccessAiConfig?: boolean;
}

export type AdminRole = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF' | 'SUPPORT';

export enum UserRole {
  USER = 'user',
  WAITER = 'waiter',
  CHEF = 'chef',
  MANAGER = 'manager',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber?: string | null;
  createdAt: string;
  lastLogin: string;
  points?: number;
  level?: number;
  badges?: string[];
  biometricEnabled?: boolean;
  role?: UserRole;
  isAdmin?: boolean;
  adminRole?: AdminRole;
  permissions?: AdminPermissions;
  preferences?: {
    preferredOrders: string[];
    greetingStyle: string;
    topicsOfInterest: string[];
    personalityNotes: string;
    lastAnalyzedAt?: any;
  };
}

export interface AppSettings {
  whatsappNumber: string;
  address: string;
  phone: string;
  email: string;
  lat: number;
  lng: number;
  orderCounter?: number;
  isOpen?: boolean;
  aiAutoPilot?: boolean;
  verificationRequired?: boolean;
  maintenanceMode?: boolean;
}

export interface Attraction {
  id: string;
  name: string;
  description: string;
  distance: string;
  image: string;
}

export interface GuestCheckIn {
  id?: string;
  guestId: string;
  guestName: string;
  guestPhone?: string;
  pointsAwarded: number;
  tableOrArea?: string;
  staffId?: string;
  staffName?: string;
  checkedInAt: string;
  status: 'completed' | 'verified' | 'cancelled';
  notes?: string;
}

export interface GuestLoyaltySummary {
  guest: {
    uid: string;
    displayName: string;
    email: string;
    phoneNumber?: string | null;
    photoURL?: string | null;
    points: number;
    level: number;
    rankTitle: string;
    badges: string[];
    createdAt: string;
    lastVisit: string;
    visitsCount: number;
    favoriteItems?: string[];
    hospitalityNotes?: string;
  };
  checkIns: GuestCheckIn[];
  recentOrders?: {
    id: string;
    itemsSummary: string;
    total: number;
    date: string;
  }[];
  nextTierPoints: number;
  tierProgressPercent: number;
}
