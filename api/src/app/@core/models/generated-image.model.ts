export interface GeneratedImage {
  id: number;
  userId: string;
  chatSessionId?: string;
  generationId?: string;
  productId?: number;
  productSizeId?: number;
  productFrameId?: number;
  prompt: string;
  improvedPrompt?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  uploadedImageUrl?: string;
  userIntent?: string;
  isGenerateMode?: boolean;
  creditsUsed: number;
  isSelected: boolean;
  createdAt: string;
  updatedAt?: string;
  // Joined fields
  productName?: string;
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
}
