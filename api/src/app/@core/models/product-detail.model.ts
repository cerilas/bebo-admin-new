export interface ProductDetail {
  id?: number;
  productId: number;
  shortDescription?: string;
  shortDescriptionEn?: string;
  shortDescriptionFr?: string;
  longDescriptionHtml?: string;
  longDescriptionHtmlEn?: string;
  longDescriptionHtmlFr?: string;
  galleryImages: string[];
  videoUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
