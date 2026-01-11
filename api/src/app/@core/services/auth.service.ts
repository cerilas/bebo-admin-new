import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import * as CryptoJS from 'crypto-js';

interface AdminUser {
  username: string;
  passwordHash: string;
  accessKeyHash: string;
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
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private currentUserSubject = new BehaviorSubject<AuthSession | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Admin kullanıcıları - önceden hesaplanmış hash'ler
  private adminUsers: AdminUser[] = [];

  constructor(private router: Router) {
    // Admin kullanıcıları initialize et
    this.initAdminUsers();
    
    // Session kontrolü
    this.isAuthenticatedSubject.next(this.checkSession());
    this.currentUserSubject.next(this.getSession());
    this.startSessionCheck();
  }

  private initAdminUsers() {
    this.adminUsers = [
      {
        username: 'admin',
        passwordHash: this.hashValue('admin123'),
        accessKeyHash: this.hashValue('birebiro2024'),
        displayName: 'Admin',
        role: 'super_admin'
      },
      {
        username: 'deniz',
        passwordHash: this.hashValue('deniz123'),
        accessKeyHash: this.hashValue('birebiro2024'),
        displayName: 'Deniz Can',
        role: 'admin'
      },
      {
        username: 'erdem',
        passwordHash: this.hashValue('erdem123'),
        accessKeyHash: this.hashValue('birebiro2024'),
        displayName: 'Erdem',
        role: 'admin'
      }
    ];
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

  login(username: string, password: string, accessKey: string): { success: boolean; message: string } {
    // Input validation
    if (!username || !password || !accessKey) {
      return { success: false, message: 'Tüm alanları doldurunuz.' };
    }

    // Rate limiting için localStorage kontrolü
    const attemptKey = 'login_attempts';
    const attempts = JSON.parse(localStorage.getItem(attemptKey) || '{"count": 0, "lastAttempt": 0}');
    const now = Date.now();
    
    // 5 başarısız denemeden sonra 5 dakika bekle
    if (attempts.count >= 5 && (now - attempts.lastAttempt) < 5 * 60 * 1000) {
      const remainingTime = Math.ceil((5 * 60 * 1000 - (now - attempts.lastAttempt)) / 1000 / 60);
      return { success: false, message: `Çok fazla başarısız deneme. ${remainingTime} dakika sonra tekrar deneyin.` };
    }

    // Reset attempts after cooldown
    if ((now - attempts.lastAttempt) > 5 * 60 * 1000) {
      attempts.count = 0;
    }

    // Hash credentials
    const passwordHash = this.hashValue(password);
    const accessKeyHash = this.hashValue(accessKey);

    // Find user
    const user = this.adminUsers.find(u => 
      u.username.toLowerCase() === username.toLowerCase() &&
      u.passwordHash === passwordHash &&
      u.accessKeyHash === accessKeyHash
    );

    if (!user) {
      // Increment failed attempts
      attempts.count++;
      attempts.lastAttempt = now;
      localStorage.setItem(attemptKey, JSON.stringify(attempts));
      
      return { success: false, message: 'Geçersiz kullanıcı adı, şifre veya erişim anahtarı.' };
    }

    // Reset attempts on success
    localStorage.removeItem(attemptKey);

    // Create session
    const session: AuthSession = {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      loginTime: now,
      expiresAt: now + this.SESSION_DURATION,
      token: this.generateToken()
    };

    // Encrypt and store session
    const encryptedSession = CryptoJS.AES.encrypt(
      JSON.stringify(session),
      this.SECRET_SALT
    ).toString();
    
    localStorage.setItem(this.SESSION_KEY, encryptedSession);
    
    this.isAuthenticatedSubject.next(true);
    this.currentUserSubject.next(session);

    return { success: true, message: 'Giriş başarılı!' };
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
