import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NbButtonModule, NbIconModule, NbSpinnerModule } from '@nebular/theme';
import { finalize } from 'rxjs/operators';
import { ImageUploadService } from '../../../@core/services/image-upload.service';

@Component({
  selector: 'ngx-admin-image-upload',
  standalone: true,
  imports: [CommonModule, NbButtonModule, NbIconModule, NbSpinnerModule],
  templateUrl: './admin-image-upload.component.html',
  styleUrls: ['./admin-image-upload.component.scss'],
})
export class AdminImageUploadComponent {
  @Input() currentUrl = '';
  @Input() buttonText = 'Yükle';
  @Input() compact = false;
  @Input() source = '';

  @Output() uploaded = new EventEmitter<string>();
  @Output() uploadError = new EventEmitter<string>();
  @Output() uploadingChange = new EventEmitter<boolean>();

  uploading = false;
  dragActive = false;
  errorMessage = '';

  constructor(private imageUploadService: ImageUploadService) {}

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.handleFile(file);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    this.handleFile(file);
  }

  private handleFile(file: File): void {
    this.errorMessage = '';

    if (!file.type.startsWith('image/')) {
      this.setError('Sadece görsel dosyaları yükleyebilirsiniz.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.setError('Dosya boyutu en fazla 5MB olabilir.');
      return;
    }

    this.uploading = true;
    this.uploadingChange.emit(true);

    this.imageUploadService.uploadImage(file, this.source)
      .pipe(finalize(() => {
        this.uploading = false;
        this.uploadingChange.emit(false);
      }))
      .subscribe({
        next: (response) => {
          if (!response?.image_url) {
            this.setError('Sunucu geçerli bir görsel URL döndürmedi.');
            return;
          }

          this.uploaded.emit(response.image_url);
        },
        error: (error) => {
          const serverMessage = error?.error?.error || error?.error?.message || error?.message;
          this.setError(serverMessage || 'Görsel yüklenemedi. Lütfen tekrar deneyin.');
        },
      });
  }

  private setError(message: string): void {
    this.errorMessage = message;
    this.uploadError.emit(message);
  }
}
