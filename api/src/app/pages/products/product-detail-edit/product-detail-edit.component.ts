import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NbToastrService } from '@nebular/theme';

import '../../editors/ckeditor/ckeditor.loader';
import 'ckeditor';
import { ProductsService } from '../../../@core/services/products.service';
import { ImageUploadService } from '../../../@core/services/image-upload.service';
import { ProductDetail } from '../../../@core/models';

@Component({
  selector: 'ngx-product-detail-edit',
  templateUrl: './product-detail-edit.component.html',
  styleUrls: ['./product-detail-edit.component.scss'],
})
export class ProductDetailEditComponent implements OnInit {
  productId: number;
  productName = '';
  loading = true;
  saving = false;
  uploading = false;

  form: FormGroup;
  galleryImages: string[] = [];
  activeTab = 'tr';

  longDescriptionHtml = '';
  longDescriptionHtmlEn = '';
  longDescriptionHtmlFr = '';

  editorConfig = {
    extraPlugins: 'divarea',
    height: 300,
    language: 'tr',
    toolbar: [
      { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike', 'RemoveFormat'] },
      { name: 'paragraph', items: ['NumberedList', 'BulletedList', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight'] },
      { name: 'links', items: ['Link', 'Unlink'] },
      { name: 'insert', items: ['Image', 'Table', 'HorizontalRule'] },
      { name: 'styles', items: ['Format', 'FontSize'] },
      { name: 'colors', items: ['TextColor', 'BGColor'] },
      { name: 'tools', items: ['Maximize', 'Source'] },
    ],
    removePlugins: 'elementspath',
    resize_enabled: false,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private productsService: ProductsService,
    private imageUploadService: ImageUploadService,
    private toastrService: NbToastrService,
  ) {
    this.form = this.fb.group({
      shortDescription: [''],
      shortDescriptionEn: [''],
      shortDescriptionFr: [''],
      longDescriptionHtml: [''],
      longDescriptionHtmlEn: [''],
      longDescriptionHtmlFr: [''],
      videoUrl: [''],
    });
  }

  ngOnInit(): void {
    this.productId = +this.route.snapshot.paramMap.get('id');
    this.loadProduct();
    this.loadDetail();
  }

  loadProduct(): void {
    this.productsService.getProduct(this.productId).subscribe({
      next: (product) => {
        this.productName = product.name;
      },
    });
  }

  loadDetail(): void {
    this.loading = true;
    this.productsService.getProductDetail(this.productId).subscribe({
      next: (detail) => {
        if (detail) {
          this.form.patchValue({
            shortDescription: detail.shortDescription || '',
            shortDescriptionEn: detail.shortDescriptionEn || '',
            shortDescriptionFr: detail.shortDescriptionFr || '',
            longDescriptionHtml: detail.longDescriptionHtml || '',
            longDescriptionHtmlEn: detail.longDescriptionHtmlEn || '',
            longDescriptionHtmlFr: detail.longDescriptionHtmlFr || '',
            videoUrl: detail.videoUrl || '',
          });
          this.longDescriptionHtml = detail.longDescriptionHtml || '';
          this.longDescriptionHtmlEn = detail.longDescriptionHtmlEn || '';
          this.longDescriptionHtmlFr = detail.longDescriptionHtmlFr || '';
          this.galleryImages = detail.galleryImages || [];
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastrService.danger('Detay bilgisi yüklenemedi', 'Hata');
      },
    });
  }

  save(): void {
    this.saving = true;
    const data: Partial<ProductDetail> = {
      ...this.form.value,
      longDescriptionHtml: this.longDescriptionHtml,
      longDescriptionHtmlEn: this.longDescriptionHtmlEn,
      longDescriptionHtmlFr: this.longDescriptionHtmlFr,
      galleryImages: this.galleryImages,
    };

    this.productsService.saveProductDetail(this.productId, data).subscribe({
      next: () => {
        this.saving = false;
        this.toastrService.success('Ürün detayı kaydedildi', 'Başarılı');
      },
      error: () => {
        this.saving = false;
        this.toastrService.danger('Kaydetme başarısız', 'Hata');
      },
    });
  }

  // Gallery image management
  onGalleryFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.toastrService.warning('Lütfen bir görsel dosyası seçin', 'Uyarı');
      return;
    }

    this.uploading = true;
    this.imageUploadService.upload(file).subscribe({
      next: (res) => {
        this.galleryImages.push(res.imageUrl);
        this.uploading = false;
        this.toastrService.success('Görsel yüklendi', 'Başarılı');
      },
      error: () => {
        this.uploading = false;
        this.toastrService.danger('Görsel yüklenemedi', 'Hata');
      },
    });

    // Reset input
    input.value = '';
  }

  removeGalleryImage(index: number): void {
    this.galleryImages.splice(index, 1);
  }

  moveImageUp(index: number): void {
    if (index <= 0) return;
    const temp = this.galleryImages[index - 1];
    this.galleryImages[index - 1] = this.galleryImages[index];
    this.galleryImages[index] = temp;
  }

  moveImageDown(index: number): void {
    if (index >= this.galleryImages.length - 1) return;
    const temp = this.galleryImages[index + 1];
    this.galleryImages[index + 1] = this.galleryImages[index];
    this.galleryImages[index] = temp;
  }

  goBack(): void {
    this.router.navigate(['/pages/products/list']);
  }
}
