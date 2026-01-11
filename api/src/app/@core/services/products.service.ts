import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { Product, ProductSize, ProductFrame } from '../models';

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalSizes: number;
  totalFrames: number;
}

export interface ProductWithDetails extends Product {
  sizesCount?: number;
  framesCount?: number;
  minPrice?: number;
  maxPrice?: number;
  sizes?: ProductSize[];
  frames?: ProductFrame[];
}

@Injectable({
  providedIn: 'root',
})
export class ProductsService extends BaseApiService {
  private endpoint = '/products';

  // Stats
  getStats(): Observable<ProductStats> {
    return this.get<ProductStats>(`${this.endpoint}/stats`);
  }

  // Product CRUD
  getAll(): Observable<ProductWithDetails[]> {
    return this.get<ProductWithDetails[]>(this.endpoint);
  }

  getProducts(): Observable<ProductWithDetails[]> {
    return this.get<ProductWithDetails[]>(this.endpoint);
  }

  getProduct(id: number): Observable<ProductWithDetails> {
    return this.get<ProductWithDetails>(`${this.endpoint}/${id}`);
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.post<Product>(this.endpoint, product);
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.put<Product>(`${this.endpoint}/${id}`, product);
  }

  deleteProduct(id: number): Observable<void> {
    return this.delete<void>(`${this.endpoint}/${id}`);
  }

  // Product Sizes CRUD
  getProductSizes(productId: number): Observable<ProductSize[]> {
    return this.get<ProductSize[]>(`${this.endpoint}/${productId}/sizes`);
  }

  createProductSize(productId: number, size: Partial<ProductSize>): Observable<ProductSize> {
    return this.post<ProductSize>(`${this.endpoint}/${productId}/sizes`, size);
  }

  updateProductSize(productId: number, sizeId: number, size: Partial<ProductSize>): Observable<ProductSize> {
    return this.put<ProductSize>(`${this.endpoint}/${productId}/sizes/${sizeId}`, size);
  }

  deleteProductSize(productId: number, sizeId: number): Observable<void> {
    return this.delete<void>(`${this.endpoint}/${productId}/sizes/${sizeId}`);
  }

  // Product Frames CRUD
  getProductFrames(productId: number): Observable<ProductFrame[]> {
    return this.get<ProductFrame[]>(`${this.endpoint}/${productId}/frames`);
  }

  createProductFrame(productId: number, frame: Partial<ProductFrame>): Observable<ProductFrame> {
    return this.post<ProductFrame>(`${this.endpoint}/${productId}/frames`, frame);
  }

  updateProductFrame(productId: number, frameId: number, frame: Partial<ProductFrame>): Observable<ProductFrame> {
    return this.put<ProductFrame>(`${this.endpoint}/${productId}/frames/${frameId}`, frame);
  }

  deleteProductFrame(productId: number, frameId: number): Observable<void> {
    return this.delete<void>(`${this.endpoint}/${productId}/frames/${frameId}`);
  }
}
