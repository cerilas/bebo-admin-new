export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  isRead: boolean;
  isReplied: boolean;
  createdAt: string;
  updatedAt?: string;
}
