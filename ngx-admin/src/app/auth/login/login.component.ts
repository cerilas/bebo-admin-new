import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../@core/services/auth.service';

@Component({
  selector: 'ngx-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error = '';
  showPassword = false;
  showAccessKey = false;
  returnUrl: string = '/pages/dashboard';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Zaten giriş yapmışsa dashboard'a yönlendir
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/pages/dashboard']);
    }
  }

  ngOnInit() {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      accessKey: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });

    // Return URL'i al
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/pages/dashboard';
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.markFormTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    const { username, password, accessKey } = this.loginForm.value;

    // Simulate loading for better UX
    setTimeout(() => {
      const result = this.authService.login(username, password, accessKey);
      
      if (result.success) {
        this.router.navigate([this.returnUrl]);
      } else {
        this.error = result.message;
        this.loading = false;
      }
    }, 800);
  }

  private markFormTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleAccessKey() {
    this.showAccessKey = !this.showAccessKey;
  }

  getFieldError(field: string): string {
    const control = this.loginForm.get(field);
    if (control?.hasError('required')) {
      return 'Bu alan zorunludur';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `En az ${minLength} karakter olmalıdır`;
    }
    return '';
  }
}
