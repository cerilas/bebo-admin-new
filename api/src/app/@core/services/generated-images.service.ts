import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { GeneratedImage } from '../models';

export interface ImageStats {
  totalImages: number;
  totalCredits: number;
  selectedImages: number;
  uniqueUsers: number;
  today: number;
  thisWeek: number;
  generateMode: number;
  inspirationMode: number;
}

export interface ImageFilters {
  userId?: string;
  productId?: number;
  isSelected?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ProductOption {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeneratedImagesService extends BaseApiService {
  private endpoint = '/generated-images';

  getStats(): Observable<ImageStats> {
    return this.get<ImageStats>(`${this.endpoint}/stats`);
  }

  getAll(filters?: ImageFilters): Observable<GeneratedImage[]> {
    let params = '';
    const queryParams: string[] = [];
    
    if (filters) {
      if (filters.userId) queryParams.push(`userId=${filters.userId}`);
      if (filters.productId) queryParams.push(`productId=${filters.productId}`);
      if (filters.isSelected !== undefined) queryParams.push(`isSelected=${filters.isSelected}`);
      if (filters.search) queryParams.push(`search=${encodeURIComponent(filters.search)}`);
      if (filters.limit) queryParams.push(`limit=${filters.limit}`);
      if (filters.offset) queryParams.push(`offset=${filters.offset}`);
    }
    
    if (queryParams.length > 0) {
      params = '?' + queryParams.join('&');
    }
    
    return this.get<GeneratedImage[]>(`${this.endpoint}${params}`);
  }

  getImage(id: number): Observable<GeneratedImage> {
    return this.get<GeneratedImage>(`${this.endpoint}/${id}`);
  }

  deleteImage(id: number): Observable<{ message: string }> {
    return this.delete<{ message: string }>(`${this.endpoint}/${id}`);
  }

  getProductOptions(): Observable<ProductOption[]> {
    return this.get<ProductOption[]>(`${this.endpoint}/products/list`);
  }

  getImageStatistics(): Observable<ImageStats> {
    return this.getStats();
  }
}
