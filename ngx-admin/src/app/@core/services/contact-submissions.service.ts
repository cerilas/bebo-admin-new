import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { ContactSubmission } from '../models';

export interface ContactStats {
  total: number;
  unread: number;
  read: number;
  replied: number;
  notReplied: number;
  today: number;
  thisWeek: number;
}

@Injectable({
  providedIn: 'root',
})
export class ContactSubmissionsService extends BaseApiService {
  private endpoint = '/contact-submissions';

  getStats(): Observable<ContactStats> {
    return this.get<ContactStats>(`${this.endpoint}/stats`);
  }

  getAll(status?: string, search?: string): Observable<ContactSubmission[]> {
    let params = '';
    const queryParams: string[] = [];
    
    if (status && status !== 'all') {
      queryParams.push(`status=${status}`);
    }
    if (search) {
      queryParams.push(`search=${encodeURIComponent(search)}`);
    }
    
    if (queryParams.length > 0) {
      params = '?' + queryParams.join('&');
    }
    
    return this.get<ContactSubmission[]>(`${this.endpoint}${params}`);
  }

  getSubmissions(): Observable<ContactSubmission[]> {
    return this.get<ContactSubmission[]>(this.endpoint);
  }

  getSubmission(id: number): Observable<ContactSubmission> {
    return this.get<ContactSubmission>(`${this.endpoint}/${id}`);
  }

  markAsRead(id: number): Observable<ContactSubmission> {
    return this.patch<ContactSubmission>(`${this.endpoint}/${id}/read`, {});
  }

  markAsReplied(id: number): Observable<ContactSubmission> {
    return this.patch<ContactSubmission>(`${this.endpoint}/${id}/replied`, {});
  }

  deleteSubmission(id: number): Observable<{ message: string }> {
    return this.delete<{ message: string }>(`${this.endpoint}/${id}`);
  }

  bulkMarkAsRead(ids: number[]): Observable<{ message: string }> {
    return this.post<{ message: string }>(`${this.endpoint}/bulk-read`, { ids });
  }
}
