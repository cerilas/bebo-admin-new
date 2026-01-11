export interface AboutContent {
  id: number;
  language: 'tr' | 'en' | 'fr';
  image1?: string;
  title1: string;
  body1: string;
  image2?: string;
  title2: string;
  body2: string;
  image3?: string;
  title3: string;
  body3: string;
  mission: string;
  vision: string;
  createdAt: Date;
  updatedAt: Date;
}
