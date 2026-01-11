import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { AboutContent } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AboutContentService extends BaseApiService {
  private endpoint = '/about-content';

  getAll(): Observable<AboutContent[]> {
    return this.get<AboutContent[]>(this.endpoint);
  }

  getContent(language: string = 'tr'): Observable<AboutContent> {
    return this.get<AboutContent>(`${this.endpoint}/${language}`);
  }

  updateContent(language: string, content: Partial<AboutContent>): Observable<AboutContent> {
    return this.put<AboutContent>(`${this.endpoint}/${language}`, content);
  }
}
