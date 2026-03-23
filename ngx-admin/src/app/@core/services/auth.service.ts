import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../../environments/environment';

interface AdminUser {
  username: string;
  displayName: string;
  role: string;
}

interface AuthSession {
  username: string;
  displayName: string;
  role: string;
  loginTime: number;
  expiresAt: number;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly SESSION_KEY = 'birebiro_admin_session';
  private readonly SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 saat
  private readonly SECRET_SALT = 'Birebiro_Admin_2024_SecureKey!@#$%';
  private readonly AUTH_API_URL = `${environment.apiUrl}/admin-auth/login`;
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private currentUserSubject = new BehaviorSubject<AuthSession | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {
    // Session kontrolü
    this.isAuthenticatedSubject.next(this.checkSession());
    this.currentUserSubject.next(this.getSession());
    this.startSessionCheck();
  }

  private hashValue(value: string): string {
    return CryptoJS.SHA256(value + this.SECRET_SALT).toString();
  }

  private generateToken(): string {
    const randomBytes = CryptoJS.lib.WordArray.random(32);
    return CryptoJS.SHA256(randomBytes.toString() + Date.now().toString()).toString();
  }

  private startSessionCheck() {
    // Her dakika session kontrolü
    setInterval(() => {
      if (!this.checkSession()) {
        this.logout();
      }
    }, 60000);
  }

  login(username: string, password: string, accessKey: string): Observable<{ success: boolean; message: string }> {
    // Input validation
    if (!username || !password || !accessKey) {
      return of({ success: false, message: 'Tüm alanları doldurunuz.' });
    }

    // Rate limiting için localStorage kontrolü
    const attemptKey = 'login_attempts';
    const attempts = JSON.parse(localStorage.getItem(attemptKey) || '{"count": 0, "lastAttempt": 0}');
    const now = Date.now();
    
    // 5 başarısız denemeden sonra 5 dakika bekle
    if (attempts.count >= 5 && (now - attempts.lastAttempt) < 5 * 60 * 1000) {
      const remainingTime = Math.ceil((5 * 60 * 1000 - (now - attempts.lastAttempt)) / 1000 / 60);
      return of({ success: false, message: `Çok fazla başarısız deneme. ${remainingTime} dakika sonra tekrar deneyin.` });
    }

    // Reset attempts after cooldown
    if ((now - attempts.lastAttempt) > 5 * 60 * 1000) {
      attempts.count = 0;
    }

    return this.http.post<{ success: boolean; user?: AdminUser; message?: string }>(this.AUTH_API_URL, {
      username,
      password,
      accessKey,
    }).pipe(
      tap((response) => {
        if (!response?.success || !response.user) {
          return;
        }

        localStorage.removeItem(attemptKey);

        const session: AuthSession = {
          username: response.user.username,
          displayName: response.user.displayName,
          role: response.user.role,
          loginTime: now,
          expiresAt: now + this.SESSION_DURATION,
          token: this.generateToken()
        };

        const encryptedSession = CryptoJS.AES.encrypt(
          JSON.stringify(session),
          this.SECRET_SALT
        ).toString();

        localStorage.setItem(this.SESSION_KEY, encryptedSession);
        this.isAuthenticatedSubject.next(true);
        this.currentUserSubject.next(session);
      }),
      map((response) => {
        if (response?.success) {
          return { success: true, message: 'Giriş başarılı!' };
        }

        attempts.count++;
        attempts.lastAttempt = Date.now();
        localStorage.setItem(attemptKey, JSON.stringify(attempts));
        return { success: false, message: response?.message || 'Giriş başarısız.' };
      }),
      catchError((error) => {
        attempts.count++;
        attempts.lastAttempt = Date.now();
        localStorage.setItem(attemptKey, JSON.stringify(attempts));

        return of({
          success: false,
          message: error?.error?.message || 'Giriş sırasında bir hata oluştu.'
        });
      })
    );
  }

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  checkSession(): boolean {
    const session = this.getSession();
    if (!session) return false;
    
    // Check expiration
    if (Date.now() > session.expiresAt) {
      this.logout();
      return false;
    }
    
    return true;
  }

  getSession(): AuthSession | null {
    try {
      const encryptedSession = localStorage.getItem(this.SESSION_KEY);
      if (!encryptedSession) return null;

      const decrypted = CryptoJS.AES.decrypt(encryptedSession, this.SECRET_SALT);
      const sessionStr = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!sessionStr) return null;
      
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }

  getCurrentUser(): AuthSession | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.checkSession();
  }

  // Session'ı yenile (her sayfa değişiminde)
  refreshSession() {
    const session = this.getSession();
    if (session) {
      session.expiresAt = Date.now() + this.SESSION_DURATION;
      const encryptedSession = CryptoJS.AES.encrypt(
        JSON.stringify(session),
        this.SECRET_SALT
      ).toString();
      localStorage.setItem(this.SESSION_KEY, encryptedSession);
    }
  }
}
