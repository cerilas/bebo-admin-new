export interface Product {
  id: number;
  slug: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  description: string;
  descriptionEn?: string;
  descriptionFr?: string;
  imageSquareUrl?: string;
  imageSquareUrl2?: string;
  imageSquareUrl3?: string;
  imageWideUrl?: string;
  imageDimensions: string;
  sizeLabel: string;
  sizeLabelEn?: string;
  sizeLabelFr?: string;
  frameLabel: string;
  frameLabelEn?: string;
  frameLabelFr?: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface ProductSize {
  id: number;
  productId: number;
  slug: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  dimensions: string;
  priceAmount: number; // in cents
  sortOrder: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface ProductFrame {
  id: number;
  productId: number;
  slug: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  priceAmount: number; // in cents
  colorCode?: string;
  frameImage?: string;
  frameImageLarge?: string;
  sortOrder: number;
  updatedAt: Date;
  createdAt: Date;
}
