import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NbToastrService } from '@nebular/theme';
import { ProductsService, ProductWithDetails } from '../../../@core/services/products.service';
import { ProductSize, ProductFrame } from '../../../@core/models/product.model';
import { ImageUploadService } from '../../../@core/services/image-upload.service';

@Component({
  selector: 'ngx-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
})
export class ProductFormComponent implements OnInit {
  productForm: FormGroup;
  isEditMode = false;
  productId: number;
  loading = false;
  submitting = false;

  // Product data with sizes and frames
  product: ProductWithDetails | null = null;
  sizes: ProductSize[] = [];
  frames: ProductFrame[] = [];

  // Size editing
  editingSizeId: number | null = null;
  sizeForm: FormGroup;
  showSizeForm = false;
  savingSize = false;

  // Frame editing
  editingFrameId: number | null = null;
  frameForm: FormGroup;
  showFrameForm = false;
  savingFrame = false;

  // Image upload states
  uploadingSquareImage = false;
  uploadingSquareImage2 = false;
  uploadingSquareImage3 = false;
  uploadingWideImage = false;
  uploadingFrameImage = false;
  uploadingFrameImageLarge = false;
  uploadingMockupTemplate = false;

  constructor(
    private fb: FormBuilder,
    private productsService: ProductsService,
    private imageUploadService: ImageUploadService,
    private route: ActivatedRoute,
    private router: Router,
    private toastrService: NbToastrService,
  ) {
    this.initForm();
    this.initSizeForm();
    this.initFrameForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.productId = +params['id'];
        this.loadProduct();
      }
    });
  }

  initForm(): void {
    this.productForm = this.fb.group({
      slug: ['', [Validators.required, Validators.maxLength(100)]],
      name: ['', Validators.required],
      nameEn: [''],
      nameFr: [''],
      description: ['', Validators.required],
      descriptionEn: [''],
      descriptionFr: [''],
      imageSquareUrl: [''],
      imageSquareUrl2: [''],
      imageSquareUrl3: [''],
      imageWideUrl: [''],
      imageDimensions: ['1920x1080', Validators.required],
      sizeLabel: ['Boyut Seçin', Validators.required],
      sizeLabelEn: ['Select Size'],
      sizeLabelFr: ['Sélectionner la taille'],
      frameLabel: ['Çerçeve Seçin', Validators.required],
      frameLabelEn: ['Select Frame'],
      frameLabelFr: ['Sélectionner le cadre'],
      isActive: [true],
      sortOrder: [0, Validators.required],
    });
  }

  initSizeForm(): void {
    this.sizeForm = this.fb.group({
      slug: ['', Validators.required],
      name: ['', Validators.required],
      nameEn: [''],
      nameFr: [''],
      dimensions: ['', Validators.required],
      priceAmount: [0, [Validators.required, Validators.min(0)]],
      sortOrder: [0],
    });
  }

  initFrameForm(): void {
    this.frameForm = this.fb.group({
      slug: ['', Validators.required],
      name: ['', Validators.required],
      nameEn: [''],
      nameFr: [''],
      priceAmount: [0, [Validators.required, Validators.min(0)]],
      colorCode: ['#000000'],
      frameImage: [''],
      frameImageLarge: [''],
      mockupTemplate: [''],
      mockupConfigType: ['frame'],
      mockupConfigX: [12],
      mockupConfigY: [15],
      mockupConfigWidth: [76],
      mockupConfigHeight: [70],
      sortOrder: [0],
    });
  }

  loadProduct(): void {
    this.loading = true;
    this.productsService.getProduct(this.productId).subscribe({
      next: (product) => {
        this.product = product;
        this.productForm.patchValue(product);
        this.sizes = product.sizes || [];
        this.frames = product.frames || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.toastrService.danger('Ürün yüklenirken bir hata oluştu', 'Hata');
        this.loading = false;
      },
    });
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.toastrService.warning('Lütfen tüm gerekli alanları doldurun', 'Uyarı');
      return;
    }

    this.submitting = true;
    const productData = this.productForm.value;

    const request = this.isEditMode
      ? this.productsService.updateProduct(this.productId, productData)
      : this.productsService.createProduct(productData);

    request.subscribe({
      next: (response: any) => {
        const message = this.isEditMode
          ? 'Ürün başarıyla güncellendi'
          : 'Ürün başarıyla oluşturuldu';
        this.toastrService.success(message, 'Başarılı');

        if (!this.isEditMode && response?.id) {
          // Yeni ürün oluşturulduysa, düzenleme moduna geç
          this.router.navigate(['/pages/products/edit', response.id]);
        }
      },
      error: (error) => {
        console.error('Error saving product:', error);
        this.toastrService.danger('Ürün kaydedilirken bir hata oluştu', 'Hata');
        this.submitting = false;
      },
      complete: () => {
        this.submitting = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/pages/products/list']);
  }

  // ==================== SIZE MANAGEMENT ====================

  addSize(): void {
    this.editingSizeId = null;
    this.sizeForm.reset({ sortOrder: this.sizes.length, priceAmount: 0 });
    this.showSizeForm = true;
  }

  editSize(size: ProductSize): void {
    this.editingSizeId = size.id;
    this.sizeForm.patchValue({
      ...size,
      priceAmount: size.priceAmount / 100, // Convert from cents to TL
    });
    this.showSizeForm = true;
  }

  cancelSizeEdit(): void {
    this.showSizeForm = false;
    this.editingSizeId = null;
    this.sizeForm.reset();
  }

  saveSize(): void {
    if (this.sizeForm.invalid) {
      this.toastrService.warning('Lütfen tüm gerekli alanları doldurun', 'Uyarı');
      return;
    }

    this.savingSize = true;
    const sizeData = {
      ...this.sizeForm.value,
      priceAmount: Math.round(this.sizeForm.value.priceAmount * 100), // Convert to cents
    };

    const request = this.editingSizeId
      ? this.productsService.updateProductSize(this.productId, this.editingSizeId, sizeData)
      : this.productsService.createProductSize(this.productId, sizeData);

    request.subscribe({
      next: () => {
        this.toastrService.success(
          this.editingSizeId ? 'Boyut güncellendi' : 'Boyut eklendi',
          'Başarılı'
        );
        this.cancelSizeEdit();
        this.loadProduct();
      },
      error: (error) => {
        console.error('Size save error:', error);
        this.toastrService.danger('Boyut kaydedilemedi', 'Hata');
      },
      complete: () => {
        this.savingSize = false;
      }
    });
  }

  deleteSize(size: ProductSize): void {
    if (!confirm(`"${size.name}" boyutunu silmek istediğinize emin misiniz?`)) return;

    this.productsService.deleteProductSize(this.productId, size.id).subscribe({
      next: () => {
        this.toastrService.success('Boyut silindi', 'Başarılı');
        this.loadProduct();
      },
      error: (error) => {
        console.error('Size delete error:', error);
        this.toastrService.danger('Boyut silinemedi', 'Hata');
      },
    });
  }

  // ==================== FRAME MANAGEMENT ====================

  addFrame(): void {
    this.editingFrameId = null;
    this.frameForm.reset({
      sortOrder: this.frames.length,
      priceAmount: 0,
      colorCode: '#000000',
      mockupConfigType: 'frame',
      mockupConfigX: 12,
      mockupConfigY: 15,
      mockupConfigWidth: 76,
      mockupConfigHeight: 70
    });
    this.showFrameForm = true;
  }

  editFrame(frame: ProductFrame): void {
    this.editingFrameId = frame.id;

    // Parse mockup config if exists
    let mockupConfig = { type: 'frame', x: 12, y: 15, width: 76, height: 70 };
    if ((frame as any).mockupConfig) {
      try {
        mockupConfig = typeof (frame as any).mockupConfig === 'string'
          ? JSON.parse((frame as any).mockupConfig)
          : (frame as any).mockupConfig;
      } catch (e) {
        console.error('Error parsing mockup config:', e);
      }
    }

    this.frameForm.patchValue({
      ...frame,
      priceAmount: frame.priceAmount / 100, // Convert from cents to TL
      mockupTemplate: (frame as any).mockupTemplate || '',
      mockupConfigType: mockupConfig.type || 'frame',
      mockupConfigX: mockupConfig.x || 12,
      mockupConfigY: mockupConfig.y || 15,
      mockupConfigWidth: mockupConfig.width || 76,
      mockupConfigHeight: mockupConfig.height || 70,
    });
    this.showFrameForm = true;
  }

  cancelFrameEdit(): void {
    this.showFrameForm = false;
    this.editingFrameId = null;
    this.frameForm.reset();
  }

  saveFrame(): void {
    if (this.frameForm.invalid) {
      this.toastrService.warning('Lütfen tüm gerekli alanları doldurun', 'Uyarı');
      return;
    }

    this.savingFrame = true;
    const formValue = this.frameForm.value;

    // Build mockup config JSON with type
    const mockupConfig = JSON.stringify({
      type: formValue.mockupConfigType || 'frame',
      x: formValue.mockupConfigX || 12,
      y: formValue.mockupConfigY || 15,
      width: formValue.mockupConfigWidth || 76,
      height: formValue.mockupConfigHeight || 70
    });

    const frameData = {
      slug: formValue.slug,
      name: formValue.name,
      nameEn: formValue.nameEn,
      nameFr: formValue.nameFr,
      priceAmount: Math.round(formValue.priceAmount * 100), // Convert to cents
      colorCode: formValue.colorCode,
      frameImage: formValue.frameImage,
      frameImageLarge: formValue.frameImageLarge,
      mockupTemplate: formValue.mockupTemplate,
      mockupConfig: mockupConfig,
      sortOrder: formValue.sortOrder,
    };

    const request = this.editingFrameId
      ? this.productsService.updateProductFrame(this.productId, this.editingFrameId, frameData)
      : this.productsService.createProductFrame(this.productId, frameData);

    request.subscribe({
      next: () => {
        this.toastrService.success(
          this.editingFrameId ? 'Çerçeve güncellendi' : 'Çerçeve eklendi',
          'Başarılı'
        );
        this.cancelFrameEdit();
        this.loadProduct();
      },
      error: (error) => {
        console.error('Frame save error:', error);
        this.toastrService.danger('Çerçeve kaydedilemedi', 'Hata');
      },
      complete: () => {
        this.savingFrame = false;
      }
    });
  }

  deleteFrame(frame: ProductFrame): void {
    if (!confirm(`"${frame.name}" çerçevesini silmek istediğinize emin misiniz?`)) return;

    this.productsService.deleteProductFrame(this.productId, frame.id).subscribe({
      next: () => {
        this.toastrService.success('Çerçeve silindi', 'Başarılı');
        this.loadProduct();
      },
      error: (error) => {
        console.error('Frame delete error:', error);
        this.toastrService.danger('Çerçeve silinemedi', 'Hata');
      },
    });
  }

  // ==================== HELPERS ====================

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount / 100);
  }

  // ==================== IMAGE UPLOAD ====================

  onSquareImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadingSquareImage = true;
      this.imageUploadService.upload(input.files[0]).subscribe({
        next: (response) => {
          this.productForm.patchValue({ imageSquareUrl: response.imageUrl });
          this.uploadingSquareImage = false;
          this.toastrService.success('Kare görsel 1 yüklendi', 'Başarılı');
        },
        error: (error) => {
          console.error('Square image 1 upload error:', error);
          this.uploadingSquareImage = false;
          this.toastrService.danger('Görsel yüklenemedi', 'Hata');
        },
      });
    }
  }

  onSquareImage2Select(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadingSquareImage2 = true;
      this.imageUploadService.upload(input.files[0]).subscribe({
        next: (response) => {
          this.productForm.patchValue({ imageSquareUrl2: response.imageUrl });
          this.uploadingSquareImage2 = false;
          this.toastrService.success('Kare görsel 2 yüklendi', 'Başarılı');
        },
        error: (error) => {
          console.error('Square image 2 upload error:', error);
          this.uploadingSquareImage2 = false;
          this.toastrService.danger('Görsel yüklenemedi', 'Hata');
        },
      });
    }
  }

  onSquareImage3Select(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadingSquareImage3 = true;
      this.imageUploadService.upload(input.files[0]).subscribe({
        next: (response) => {
          this.productForm.patchValue({ imageSquareUrl3: response.imageUrl });
          this.uploadingSquareImage3 = false;
          this.toastrService.success('Kare görsel 3 yüklendi', 'Başarılı');
        },
        error: (error) => {
          console.error('Square image 3 upload error:', error);
          this.uploadingSquareImage3 = false;
          this.toastrService.danger('Görsel yüklenemedi', 'Hata');
        },
      });
    }
  }

  onWideImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadingWideImage = true;
      this.imageUploadService.upload(input.files[0]).subscribe({
        next: (response) => {
          this.productForm.patchValue({ imageWideUrl: response.imageUrl });
          this.uploadingWideImage = false;
          this.toastrService.success('Geniş görsel yüklendi', 'Başarılı');
        },
        error: (error) => {
          console.error('Wide image upload error:', error);
          this.uploadingWideImage = false;
          this.toastrService.danger('Görsel yüklenemedi', 'Hata');
        },
      });
    }
  }

  onFrameImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadingFrameImage = true;
      this.imageUploadService.upload(input.files[0]).subscribe({
        next: (response) => {
          this.frameForm.patchValue({ frameImage: response.imageUrl });
          this.uploadingFrameImage = false;
          this.toastrService.success('Çerçeve görseli yüklendi', 'Başarılı');
        },
        error: (error) => {
          console.error('Frame image upload error:', error);
          this.uploadingFrameImage = false;
          this.toastrService.danger('Görsel yüklenemedi', 'Hata');
        },
      });
    }
  }

  onFrameImageLargeSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadingFrameImageLarge = true;
      this.imageUploadService.upload(input.files[0]).subscribe({
        next: (response) => {
          this.frameForm.patchValue({ frameImageLarge: response.imageUrl });
          this.uploadingFrameImageLarge = false;
          this.toastrService.success('Büyük çerçeve görseli yüklendi', 'Başarılı');
        },
        error: (error) => {
          console.error('Frame large image upload error:', error);
          this.uploadingFrameImageLarge = false;
          this.toastrService.danger('Görsel yüklenemedi', 'Hata');
        },
      });
    }
  }

  onMockupTemplateSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadingMockupTemplate = true;
      this.imageUploadService.upload(input.files[0]).subscribe({
        next: (response) => {
          this.frameForm.patchValue({ mockupTemplate: response.imageUrl });
          this.uploadingMockupTemplate = false;
          this.toastrService.success('Mockup template yüklendi', 'Başarılı');
        },
        error: (error) => {
          console.error('Mockup template upload error:', error);
          this.uploadingMockupTemplate = false;
          this.toastrService.danger('Görsel yüklenemedi', 'Hata');
        },
      });
    }
  }

  openImage(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }
}
