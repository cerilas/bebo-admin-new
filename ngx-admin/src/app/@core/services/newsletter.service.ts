import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { NewsletterSubscriber } from '../models';

export interface NewsletterStats {
  total: number;
  active: number;
  unsubscribed: number;
  bounced: number;
  lastWeek: number;
  lastMonth: number;
}

@Injectable({
  providedIn: 'root',
})
export class NewsletterService extends BaseApiService {
  private endpoint = '/newsletter-subscribers';

  getAll(status?: string, search?: string): Observable<NewsletterSubscriber[]> {
    let url = this.endpoint;
    const params: string[] = [];
    
    if (status && status !== 'all') {
      params.push(`status=${status}`);
    }
    if (search) {
      params.push(`search=${encodeURIComponent(search)}`);
    }
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    return this.get<NewsletterSubscriber[]>(url);
  }

  getSubscribers(): Observable<NewsletterSubscriber[]> {
    return this.get<NewsletterSubscriber[]>(this.endpoint);
  }

  getSubscriber(id: number): Observable<NewsletterSubscriber> {
    return this.get<NewsletterSubscriber>(`${this.endpoint}/${id}`);
  }

  getStats(): Observable<NewsletterStats> {
    return this.get<NewsletterStats>(`${this.endpoint}/stats`);
  }

  updateSubscriberStatus(id: number, status: string): Observable<{ success: boolean; data: NewsletterSubscriber }> {
    return this.patch<{ success: boolean; data: NewsletterSubscriber }>(`${this.endpoint}/${id}/status`, { status });
  }

  deleteSubscriber(id: number): Observable<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`${this.endpoint}/${id}`);
  }

  exportSubscribers(status?: string): void {
    let url = `${this.apiUrl}${this.endpoint}/export`;
    if (status && status !== 'all') {
      url += `?status=${status}`;
    }
    window.open(url, '_blank');
  }
}
