export interface LegalDocument {
  id: number;
  slug: string;
  title: string;
  content: string;
  isActive: boolean;
  sortOrder: number;
  language: 'tr' | 'en' | 'fr';
  createdAt: Date;
  updatedAt: Date;
}
