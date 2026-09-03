// Item Interface
import type { UserAddress } from './database';

export interface DonationItem {
  id: string;
  title: string;
  category: string;
  credits: number;
  aiSuggestedCredits?: number;
  location: string;
  imageUrl: string;
  images?: string[];
  pickupAddress?: UserAddress;
  description?: string;
  condition?: string;
  createdAt: string;
  isFavorite?: boolean;
  isRedeemed?: boolean;
  isFeatured?: boolean;
  status?: 'available' | 'reserved' | 'express_accepted' | 'in_transit' | 'completed';
  donorName?: string;
  donorAvatar?: string;
  userId?: string | null;
  receiverId?: string | null;
  userLocation?: string;
  isLargeItem?: boolean;
  size?: string;
}

export interface FreightOption {
  id: string;
  category: 'padrao';
  categoryLabel: string;
  name: string;
  carrierName: string;
  price: number;
  deliveryTime: string;
  icon: string;
  type: 'express' | 'standard';
  badge?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: Date | null;
  read: boolean;
  type?: string;
  itemId?: string;
  donationId?: string;
  chatId?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
}

export interface AdminReport {
  id: string;
  donationId: string;
  donationTitle: string;
  reportedUserId: string | null;
  reporterUserId: string;
  reporterName: string;
  reason: string;
  details: string;
  createdAt: Date | null;
  status: string;
}
