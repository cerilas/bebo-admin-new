// Utility to ensure image URLs are absolute in production
import { environment } from '../../../environments/environment';

/**
 * Returns an absolute image URL for /api/files/... paths in production.
 * If the URL is already absolute or not a file, returns as is.
 */
export function getAbsoluteImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // If already absolute (http/https), return as is
  if (/^https?:\/\//i.test(url)) return url;
  // If starts with /api/files, prepend window.location.origin in production
  if (url.startsWith('/api/files')) {
    if (environment.production) {
      return `https://admin.birebiro.com${url}`;
    }
    // In dev, backend is usually proxied, so relative is fine
    return url;
  }
  return url;
}