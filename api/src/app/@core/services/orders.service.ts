import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { Order } from '../models';

export interface RefundResponse {
  success: boolean;
  message?: string;
  refundAmount?: string;
  merchantOid?: string;
  isTest?: boolean;
  error?: string;
  errorCode?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService extends BaseApiService {
  private endpoint = '/orders';

  getAll(): Observable<Order[]> {
    return this.get<Order[]>(this.endpoint);
  }

  getOrders(filters?: {
    paymentStatus?: string;
    shippingStatus?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<Order[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.paymentStatus) params = params.set('paymentStatus', filters.paymentStatus);
      if (filters.shippingStatus) params = params.set('shippingStatus', filters.shippingStatus);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
    }

    return this.get<Order[]>(this.endpoint, params);
  }

  getOrder(id: number): Observable<Order> {
    return this.get<Order>(`${this.endpoint}/${id}`);
  }

  updateOrderShippingStatus(id: number, status: string, trackingNumber?: string): Observable<Order> {
    return this.patch<Order>(`${this.endpoint}/${id}/shipping`, {
      shippingStatus: status,
      trackingNumber,
    });
  }

  updateOrderNotes(id: number, notes: string): Observable<Order> {
    return this.patch<Order>(`${this.endpoint}/${id}/notes`, { notes });
  }

  /**
   * PayTR üzerinden sipariş iadesi yapar
   * @param id Sipariş ID
   * @param amount İade tutarı (kuruş cinsinden, opsiyonel - boş bırakılırsa tam iade)
   * @param reason İade nedeni
   */
  refundOrder(id: number, amount?: number, reason?: string): Observable<RefundResponse> {
    return this.http.post<RefundResponse>(`${this.apiUrl}${this.endpoint}/${id}/refund`, {
      amount,
      reason,
    });
  }

  getOrderStatistics(): Observable<{
    totalOrders: number;
    totalRevenue: number;
    pendingShipments: number;
    successfulPayments: number;
  }> {
    return this.get(`${this.endpoint}/statistics`);
  }
}
