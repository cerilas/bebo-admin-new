import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { ArtCreditSettings } from '../models';

export interface SiteSettings {
  about_title?: string;
  about_content?: string;
  about_mission?: string;
  about_vision?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  social_instagram?: string;
  social_twitter?: string;
  social_facebook?: string;
  [key: string]: string | undefined;
}

// Yeni site_settings tablosu için interface
export interface SiteSetting {
  id?: number;
  key: string;
  value: string;
  valueType: 'text' | 'email' | 'phone' | 'url' | 'textarea';
  category: 'contact' | 'company' | 'social' | 'general';
  label?: string;
  description?: string;
  isPublic: boolean;
  updatedAt?: string;
}

export interface AboutContent {
  id?: number;
  language: string;
  image1?: string;
  title1: string;
  body1: string;
  image2?: string;
  title2: string;
  body2: string;
  image3?: string;
  title3: string;
  body3: string;
  mission: string;
  vision: string;
  updatedAt?: string;
}

export interface LegalDocument {
  id?: number;
  slug: string;
  title: string;
  content: string;
  language: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService extends BaseApiService {
  private creditSettingsEndpoint = '/credit-settings';
  private siteSettingsEndpoint = '/settings';
  private newSiteSettingsEndpoint = '/site-settings';
  private aboutContentEndpoint = '/about-content';
  private legalDocumentsEndpoint = '/legal-documents';

  // Credit Settings
  getCreditSettings(): Observable<ArtCreditSettings> {
    return this.get<ArtCreditSettings>(this.creditSettingsEndpoint);
  }

  updateCreditSettings(settings: Partial<ArtCreditSettings>): Observable<{ success: boolean; data: ArtCreditSettings }> {
    return this.put<{ success: boolean; data: ArtCreditSettings }>(this.creditSettingsEndpoint, settings);
  }

  // Site Settings (Contact, Social) - Simple key-value
  getSiteSettings(): Observable<SiteSettings> {
    return this.get<SiteSettings>(this.siteSettingsEndpoint);
  }

  updateSiteSettings(settings: SiteSettings): Observable<{ success: boolean; message: string }> {
    return this.put<{ success: boolean; message: string }>(this.siteSettingsEndpoint, settings);
  }

  // About Content - Her dil için ayrı satır
  getAllAboutContent(): Observable<AboutContent[]> {
    return this.get<AboutContent[]>(this.aboutContentEndpoint);
  }

  getAboutContent(language: string): Observable<AboutContent> {
    return this.get<AboutContent>(`${this.aboutContentEndpoint}/${language}`);
  }

  updateAboutContent(language: string, content: Partial<AboutContent>): Observable<{ success: boolean; data: AboutContent }> {
    return this.put<{ success: boolean; data: AboutContent }>(`${this.aboutContentEndpoint}/${language}`, content);
  }

  updateAllAboutContent(contents: AboutContent[]): Observable<{ success: boolean; message: string }> {
    return this.put<{ success: boolean; message: string }>(this.aboutContentEndpoint, contents);
  }

  // Legal Documents
  getAllLegalDocuments(language?: string): Observable<LegalDocument[]> {
    const params = language ? `?language=${language}` : '';
    return this.get<LegalDocument[]>(`${this.legalDocumentsEndpoint}${params}`);
  }

  getLegalDocumentBySlug(slug: string, language?: string): Observable<LegalDocument | LegalDocument[]> {
    const params = language ? `?language=${language}` : '';
    return this.get<LegalDocument | LegalDocument[]>(`${this.legalDocumentsEndpoint}/${slug}${params}`);
  }

  updateLegalDocument(id: number, data: Partial<LegalDocument>): Observable<LegalDocument> {
    return this.put<LegalDocument>(`${this.legalDocumentsEndpoint}/${id}`, data);
  }

  createLegalDocument(data: Partial<LegalDocument>): Observable<LegalDocument> {
    return this.post<LegalDocument>(this.legalDocumentsEndpoint, data);
  }

  deleteLegalDocument(id: number): Observable<{ message: string }> {
    return this.delete<{ message: string }>(`${this.legalDocumentsEndpoint}/${id}`);
  }

  // ==================== NEW SITE SETTINGS (site_settings table) ====================

  // Get all site settings
  getAllSiteSettings(): Observable<SiteSetting[]> {
    return this.get<SiteSetting[]>(this.newSiteSettingsEndpoint);
  }

  // Get site settings by category
  getSiteSettingsByCategory(category: string): Observable<SiteSetting[]> {
    return this.get<SiteSetting[]>(`${this.newSiteSettingsEndpoint}/category/${category}`);
  }

  // Get single site setting by key
  getSiteSettingByKey(key: string): Observable<SiteSetting> {
    return this.get<SiteSetting>(`${this.newSiteSettingsEndpoint}/key/${key}`);
  }

  // Create or update single site setting
  upsertSiteSetting(key: string, setting: Partial<SiteSetting>): Observable<{ success: boolean; id: number; message: string }> {
    return this.put<{ success: boolean; id: number; message: string }>(`${this.newSiteSettingsEndpoint}/${key}`, setting);
  }

  // Bulk update site settings
  bulkUpdateSiteSettings(settings: SiteSetting[]): Observable<{ success: boolean; message: string }> {
    return this.put<{ success: boolean; message: string }>(this.newSiteSettingsEndpoint, settings);
  }

  // Delete site setting
  deleteSiteSetting(key: string): Observable<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`${this.newSiteSettingsEndpoint}/${key}`);
  }

  // Get public settings (for frontend)
  getPublicSiteSettings(): Observable<{ [key: string]: string }> {
    return this.get<{ [key: string]: string }>(`${this.newSiteSettingsEndpoint}/public`);
  }
}
