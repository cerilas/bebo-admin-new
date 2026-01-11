export interface User {
  id: string;
  clerkUserId: string;
  artCredits: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  imageUrl?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCity?: string;
  customerAddress?: string;
  totalOrders?: number;
  totalSpent?: number;
  totalGenerations?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDetail extends User {
  orders: UserOrder[];
  generatedImages: UserGeneratedImage[];
}

export interface UserOrder {
  id: number;
  orderType: string;
  totalAmount: number;
  paymentStatus: string;
  shippingStatus?: string;
  trackingNumber?: string;
  productName?: string;
  generatedImageUrl?: string;
  createdAt: Date;
}

export interface UserGeneratedImage {
  id: number;
  prompt: string;
  imageUrl: string;
  thumbnailUrl?: string;
  creditsUsed: number;
  isSelectedForOrder: boolean;
  productName?: string;
  createdAt: Date;
}
