export interface NewsletterSubscriber {
  id: number;
  email: string;
  name?: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  subscriptionSource?: string;
  ipAddress?: string;
  userAgent?: string;
  verifiedAt?: Date;
  unsubscribedAt?: Date;
  unsubscribeToken?: string;
  preferences?: string;
  createdAt: Date;
  updatedAt: Date;
}
