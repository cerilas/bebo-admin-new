import { Component, Input, OnInit } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';
import { UsersService } from '../../../@core/services/users.service';
import { UserDetail, UserGeneratedImage } from '../../../@core/models';

@Component({
  selector: 'ngx-user-detail',
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit {
  @Input() userId: string;
  
  user: UserDetail = null;
  loading = true;
  saving = false;
  error: string = null;
  hasChanges = false;

  // Kredi düzenleme
  editingCredits = false;
  newCredits: number = 0;

  // Görsel pagination
  imagesPage = 1;
  imagesPageSize = 12;
  
  // Lightbox
  selectedImage: UserGeneratedImage = null;
  showLightbox = false;

  Math = Math;

  constructor(
    protected ref: NbDialogRef<UserDetailComponent>,
    private usersService: UsersService
  ) {}

  ngOnInit() {
    this.loadUserDetail();
  }

  loadUserDetail() {
    this.loading = true;
    this.error = null;
    
    this.usersService.getUser(this.userId).subscribe({
      next: (data) => {
        this.user = data;
        this.newCredits = data.artCredits || 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('User detail error:', err);
        this.error = 'Kullanıcı detayları yüklenirken hata oluştu.';
        this.loading = false;
      }
    });
  }

  // Görsel pagination
  get paginatedImages(): UserGeneratedImage[] {
    if (!this.user?.generatedImages) return [];
    const start = (this.imagesPage - 1) * this.imagesPageSize;
    return this.user.generatedImages.slice(start, start + this.imagesPageSize);
  }

  get totalImagesPages(): number {
    if (!this.user?.generatedImages) return 0;
    return Math.ceil(this.user.generatedImages.length / this.imagesPageSize);
  }

  goToImagesPage(page: number) {
    if (page >= 1 && page <= this.totalImagesPages) {
      this.imagesPage = page;
    }
  }

  // Lightbox
  openLightbox(img: UserGeneratedImage) {
    this.selectedImage = img;
    this.showLightbox = true;
  }

  closeLightbox() {
    this.showLightbox = false;
    this.selectedImage = null;
  }

  startEditCredits() {
    this.editingCredits = true;
    this.newCredits = this.user.artCredits || 0;
  }

  cancelEditCredits() {
    this.editingCredits = false;
    this.newCredits = this.user.artCredits || 0;
  }

  saveCredits() {
    if (this.newCredits < 0) return;

    this.saving = true;
    this.usersService.updateUserCredits(this.userId, this.newCredits).subscribe({
      next: () => {
        this.saving = false;
        this.editingCredits = false;
        this.hasChanges = true;
        this.loadUserDetail();
      },
      error: (err) => {
        console.error('Credits update error:', err);
        this.error = 'Kredi güncellenirken hata oluştu.';
        this.saving = false;
      }
    });
  }

  getPaymentStatusBadge(status: string): string {
    const badges = {
      'pending': 'warning',
      'success': 'success',
      'failed': 'danger',
      'refunded': 'info'
    };
    return badges[status] || 'basic';
  }

  getPaymentStatusText(status: string): string {
    const texts = {
      'pending': 'Bekliyor',
      'success': 'Başarılı',
      'failed': 'Başarısız',
      'refunded': 'İade'
    };
    return texts[status] || status;
  }

  getShippingStatusBadge(status: string): string {
    const badges = {
      'pending': 'warning',
      'preparing': 'info',
      'shipped': 'primary',
      'delivered': 'success',
      'cancelled': 'danger'
    };
    return badges[status] || 'basic';
  }

  getShippingStatusText(status: string): string {
    const texts = {
      'pending': 'Bekliyor',
      'preparing': 'Hazırlanıyor',
      'shipped': 'Kargoda',
      'delivered': 'Teslim Edildi',
      'cancelled': 'İptal'
    };
    return texts[status] || status;
  }

  close() {
    this.ref.close(this.hasChanges);
  }
}
