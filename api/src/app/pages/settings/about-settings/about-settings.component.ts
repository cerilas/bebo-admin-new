import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AboutContentService } from '../../../@core/services';
import { ImageUploadService } from '../../../@core/services/image-upload.service';
import { AboutContent } from '../../../@core/models';
import { NbToastrService } from '@nebular/theme';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'ngx-about-settings',
  templateUrl: './about-settings.component.html',
  styleUrls: ['./about-settings.component.scss'],
})
export class AboutSettingsComponent implements OnInit, OnDestroy {
  aboutForm: FormGroup;
  loading = false;
  saving = false;
  selectedLanguage: 'tr' | 'en' | 'fr' = 'tr';
  uploading: { [key: string]: boolean } = {};
  languages: Array<{ code: 'tr' | 'en' | 'fr'; label: string }> = [
    { code: 'tr', label: 'Türkçe' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
  ];
  imagePreview: { [key: string]: string } = {};

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private aboutContentService: AboutContentService,
    private imageUploadService: ImageUploadService,
    private toastr: NbToastrService,
  ) {
    this.aboutForm = this.fb.group({
      image1: [''],
      title1: ['', Validators.required],
      body1: ['', Validators.required],
      image2: [''],
      title2: ['', Validators.required],
      body2: ['', Validators.required],
      image3: [''],
      title3: ['', Validators.required],
      body3: ['', Validators.required],
      mission: ['', Validators.required],
      vision: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadAboutContent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAboutContent(): void {
    this.loading = true;
    this.aboutContentService
      .getContent(this.selectedLanguage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (content: AboutContent) => {
          this.populateForm(content);
          this.loading = false;
        },
        error: (error) => {
          console.error('Hakkında içeriği yüklenirken hata:', error);
          this.toastr.danger('İçerik yüklenemedi', 'Hata');
          this.loading = false;
        },
      });
  }

  populateForm(content: AboutContent): void {
    this.aboutForm.patchValue({
      image1: content.image1 || '',
      title1: content.title1,
      body1: content.body1,
      image2: content.image2 || '',
      title2: content.title2,
      body2: content.body2,
      image3: content.image3 || '',
      title3: content.title3,
      body3: content.body3,
      mission: content.mission,
      vision: content.vision,
    });

    // Reset image previews for the newly selected language
    this.imagePreview['image1'] = content.image1 || undefined;
    this.imagePreview['image2'] = content.image2 || undefined;
    this.imagePreview['image3'] = content.image3 || undefined;
  }

  onLanguageChange(language: 'tr' | 'en' | 'fr'): void {
    this.selectedLanguage = language;
    this.loadAboutContent();
  }

  onImageSelected(event: Event, imageFieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toastr.danger('Lütfen geçerli bir görsel dosyası seçin', 'Hata');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.toastr.danger('Dosya boyutu 10MB\'dan fazla olamaz', 'Hata');
      return;
    }

    this.uploadImage(file, imageFieldName);
  }

  uploadImage(file: File, imageFieldName: string): void {
    this.uploading[imageFieldName] = true;

    this.imageUploadService
      .uploadImage(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const imageUrl = response.image_url;
          this.aboutForm.patchValue({
            [imageFieldName]: imageUrl,
          });
          this.imagePreview[imageFieldName] = imageUrl;
          this.uploading[imageFieldName] = false;
          this.toastr.success('Görsel başarıyla yüklendi', 'Başarılı');
        },
        error: (error) => {
          console.error('Görsel yükleme hatası:', error);
          this.uploading[imageFieldName] = false;
          const serverMessage = error?.error?.error || error?.error?.message || error?.message;
          this.toastr.danger(serverMessage || 'Görsel yüklenemedi', 'Hata');
        },
      });
  }

  saveAboutContent(): void {
    if (this.aboutForm.invalid) {
      this.toastr.warning('Lütfen tüm gerekli alanları doldurunuz', 'Uyarı');
      return;
    }

    this.saving = true;
    const formValue = this.aboutForm.value;

    this.aboutContentService
      .updateContent(this.selectedLanguage, formValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('İçerik başarıyla güncellendi', 'Başarılı');
          this.saving = false;
        },
        error: (error) => {
          console.error('Hakkında içeriği güncellenirken hata:', error);
          const serverMessage = error?.error?.error || error?.error?.message || error?.message;
          this.toastr.danger(serverMessage || 'İçerik güncellenemedi', 'Hata');
          this.saving = false;
        },
      });
  }

  getLanguageLabel(code: string): string {
    return this.languages.find(lang => lang.code === code)?.label || code;
  }
}
