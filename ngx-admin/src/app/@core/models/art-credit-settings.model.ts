export interface ArtCreditSettings {
  id: number;
  pricePerCredit: number; // in cents
  isActive: boolean;
  minPurchase: number;
  maxPurchase: number;
  maxUserCredits: number;
  updatedAt?: Date;
  createdAt?: Date;
}
