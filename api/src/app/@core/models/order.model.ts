export interface Order {
  id: number;
  userId: string;
  generationId: string;
  imageUrl?: string;
  productId: number;
  productSizeId: number;
  productFrameId: number;
  merchantOid: string;
  paymentAmount: number;
  totalAmount?: number;
  currency: string;
  paymentStatus: 'pending' | 'success' | 'failed' | 'refunded';
  paymentType?: string;
  paytrToken?: string;
  orderType: 'product' | 'credit';
  creditAmount?: number;
  failedReasonCode?: string;
  failedReasonMsg?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  customerDistrict?: string;
  isCorporateInvoice: boolean;
  companyName?: string;
  taxNumber?: string;
  taxOffice?: string;
  companyAddress?: string;
  shippingStatus: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  notes?: string;
  paidAt?: Date;
  updatedAt: Date;
  createdAt: Date;
  // API'den gelen ekstra alanlar (JOIN'lerden)
  productName?: string;
  productNameEn?: string;
  productSlug?: string;
  productImageUrl?: string;

  // Product size info
  sizeName?: string;
  sizeDimensions?: string;
  sizePrice?: number;

  // Product frame info
  frameName?: string;
  framePrice?: number;
  frameColorCode?: string;

  // Generated image info
  generatedImageUrl?: string;
  productionImageUrl?: string;
  imagePrompt?: string;
  creditsUsed?: number;
}
