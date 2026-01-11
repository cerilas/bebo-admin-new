import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { LegalDocument } from '../models';

@Injectable({
  providedIn: 'root',
})
export class LegalDocumentsService extends BaseApiService {
  private endpoint = '/legal-documents';

  getAll(): Observable<LegalDocument[]> {
    return this.get<LegalDocument[]>(this.endpoint);
  }

  getDocuments(language?: string): Observable<LegalDocument[]> {
    const url = language ? `${this.endpoint}?language=${language}` : this.endpoint;
    return this.get<LegalDocument[]>(url);
  }

  getDocument(id: number): Observable<LegalDocument> {
    return this.get<LegalDocument>(`${this.endpoint}/${id}`);
  }

  createDocument(document: Partial<LegalDocument>): Observable<LegalDocument> {
    return this.post<LegalDocument>(this.endpoint, document);
  }

  updateDocument(id: number, document: Partial<LegalDocument>): Observable<LegalDocument> {
    return this.put<LegalDocument>(`${this.endpoint}/${id}`, document);
  }

  deleteDocument(id: number): Observable<void> {
    return this.delete<void>(`${this.endpoint}/${id}`);
  }
}
