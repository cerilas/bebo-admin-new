import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ImageUploadResponse {
  image_url: string;
  thumb_url: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImageUploadService {
  private uploadUrl = 'https://n8n-production-14b9.up.railway.app/webhook/upload-image';

  constructor(private http: HttpClient) {}

  /**
   * Upload image file to N8N webhook
   * @param file - The image file to upload
   * @returns Observable with image_url and thumb_url
   */
  uploadImage(file: File): Observable<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<ImageUploadResponse>(this.uploadUrl, formData);
  }

  /**
   * Upload image and return both URLs
   */
  upload(file: File): Observable<{ imageUrl: string; thumbUrl: string }> {
    return this.uploadImage(file).pipe(
      map(response => ({
        imageUrl: response.image_url,
        thumbUrl: response.thumb_url,
      }))
    );
  }
}
