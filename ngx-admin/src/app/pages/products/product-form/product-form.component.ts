import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NbToastrService } from '@nebular/theme';
import { ProductsService, ProductWithDetails } from '../../../@core/services/products.service';
import { ProductSize, ProductFrame, SizeFrameAvailability } from '../../../@core/models/product.model';
import { ImageUploadService } from '../../../@core/services/image-upload.service';
import { MockupConfig } from '../mockup-editor/mockup-editor.component';

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
  uploadingMockupTemplateVertical = false;

  // Size-Frame Availability
  availabilityMap: { [key: string]: boolean } = {}; // key: "sizeId_frameId"
  savingAvailability = false;
  loadingAvailability = false;

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
      desi: [1, [Validators.required, Validators.min(1)]],
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
      isActive: [true],
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
      // Yatay (Landscape) Mockup
      mockupTemplate: [''],
      mockupConfigType: ['frame'],
      mockupConfigX: [12],
      mockupConfigY: [15],
      mockupConfigWidth: [76],
      mockupConfigHeight: [70],
      mockupConfigRotation: [0],
      mockupConfigPerspective: [0],
      mockupConfigSkewX: [0],
      mockupConfigSkewY: [0],
      // Dikey (Portrait) Mockup
      mockupTemplateVertical: [''],
      mockupConfigVerticalType: ['frame'],
      mockupConfigVerticalX: [12],
      mockupConfigVerticalY: [15],
      mockupConfigVerticalWidth: [76],
      mockupConfigVerticalHeight: [70],
      mockupConfigVerticalRotation: [0],
      mockupConfigVerticalPerspective: [0],
      mockupConfigVerticalSkewX: [0],
      mockupConfigVerticalSkewY: [0],
      isActive: [true],
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
        this.loadAvailability();
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.toastrService.danger('Ürün yüklenirken bir hata oluştu', 'Hata');
        this.loading = false;
      },
    });
  }

  // ==================== SIZE-FRAME AVAILABILITY ====================

  loadAvailability(): void {
    if (!this.productId) return;
    this.loadingAvailability = true;
    this.productsService.getSizeFrameAvailability(this.productId).subscribe({
      next: (data) => {
        this.availabilityMap = {};
        // Default all combinations to true
        for (const size of this.sizes) {
          for (const frame of this.frames) {
            this.availabilityMap[`${size.id}_${frame.id}`] = true;
          }
        }
        // Override with saved values
        for (const item of data) {
          this.availabilityMap[`${item.sizeId}_${item.frameId}`] = item.isAvailable;
        }
        this.loadingAvailability = false;
      },
      error: (error) => {
        console.error('Error loading availability:', error);
        this.loadingAvailability = false;
      },
    });
  }

  getAvailability(sizeId: number, frameId: number): boolean {
    const key = `${sizeId}_${frameId}`;
    return this.availabilityMap[key] !== false;
  }

  toggleAvailability(sizeId: number, frameId: number): void {
    const key = `${sizeId}_${frameId}`;
    this.availabilityMap[key] = !this.getAvailability(sizeId, frameId);
  }

  saveAvailability(): void {
    this.savingAvailability = true;
    const availability: SizeFrameAvailability[] = [];

    for (const size of this.sizes) {
      for (const frame of this.frames) {
        availability.push({
          productId: this.productId,
          sizeId: size.id,
          frameId: frame.id,
          isAvailable: this.getAvailability(size.id, frame.id),
        });
      }
    }

    this.productsService.updateSizeFrameAvailability(this.productId, availability).subscribe({
      next: () => {
        this.toastrService.success('Stok durumu güncellendi', 'Başarılı');
        this.savingAvailability = false;
      },
      error: (error) => {
        console.error('Error saving availability:', error);
        this.toastrService.danger('Stok durumu kaydedilemedi', 'Hata');
        this.savingAvailability = false;
      },
    });
  }

  setAllAvailability(value: boolean): void {
    for (const size of this.sizes) {
      for (const frame of this.frames) {
        this.availabilityMap[`${size.id}_${frame.id}`] = value;
      }
    }
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
    this.sizeForm.reset({ sortOrder: this.sizes.length, priceAmount: 0, isActive: true });
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
      mockupConfigHeight: 70,
      mockupConfigRotation: 0,
      mockupConfigPerspective: 0,
      mockupConfigSkewX: 0,
      mockupConfigSkewY: 0,
      mockupConfigVerticalType: 'frame',
      mockupConfigVerticalX: 12,
      mockupConfigVerticalY: 15,
      mockupConfigVerticalWidth: 76,
      mockupConfigVerticalHeight: 70,
      mockupConfigVerticalRotation: 0,
      mockupConfigVerticalPerspective: 0,
      mockupConfigVerticalSkewX: 0,
      mockupConfigVerticalSkewY: 0,
      isActive: true
    });
    this.showFrameForm = true;
  }

  editFrame(frame: ProductFrame): void {
    this.editingFrameId = frame.id;

    // Parse horizontal mockup config
    let mockupConfig = { type: 'frame', x: 12, y: 15, width: 76, height: 70, rotation: 0, perspective: 0, skewX: 0, skewY: 0 };
    if ((frame as any).mockupConfig) {
      try {
        const parsed = typeof (frame as any).mockupConfig === 'string'
          ? JSON.parse((frame as any).mockupConfig)
          : (frame as any).mockupConfig;
        mockupConfig = { ...mockupConfig, ...parsed };
      } catch (e) {
        console.error('Error parsing mockup config:', e);
      }
    }

    // Parse vertical mockup config
    let mockupConfigVertical = { type: 'frame', x: 12, y: 15, width: 76, height: 70, rotation: 0, perspective: 0, skewX: 0, skewY: 0 };
    if ((frame as any).mockupConfigVertical) {
      try {
        const parsed = typeof (frame as any).mockupConfigVertical === 'string'
          ? JSON.parse((frame as any).mockupConfigVertical)
          : (frame as any).mockupConfigVertical;
        mockupConfigVertical = { ...mockupConfigVertical, ...parsed };
      } catch (e) {
        console.error('Error parsing vertical mockup config:', e);
      }
    }

    this.frameForm.patchValue({
      ...frame,
      priceAmount: frame.priceAmount / 100,
      // Yatay
      mockupTemplate: (frame as any).mockupTemplate || '',
      mockupConfigType: mockupConfig.type || 'frame',
      mockupConfigX: mockupConfig.x ?? 12,
      mockupConfigY: mockupConfig.y ?? 15,
      mockupConfigWidth: mockupConfig.width ?? 76,
      mockupConfigHeight: mockupConfig.height ?? 70,
      mockupConfigRotation: mockupConfig.rotation ?? 0,
      mockupConfigPerspective: mockupConfig.perspective ?? 0,
      mockupConfigSkewX: mockupConfig.skewX ?? 0,
      mockupConfigSkewY: mockupConfig.skewY ?? 0,
      // Dikey
      mockupTemplateVertical: (frame as any).mockupTemplateVertical || '',
      mockupConfigVerticalType: mockupConfigVertical.type || 'frame',
      mockupConfigVerticalX: mockupConfigVertical.x ?? 12,
      mockupConfigVerticalY: mockupConfigVertical.y ?? 15,
      mockupConfigVerticalWidth: mockupConfigVertical.width ?? 76,
      mockupConfigVerticalHeight: mockupConfigVertical.height ?? 70,
      mockupConfigVerticalRotation: mockupConfigVertical.rotation ?? 0,
      mockupConfigVerticalPerspective: mockupConfigVertical.perspective ?? 0,
      mockupConfigVerticalSkewX: mockupConfigVertical.skewX ?? 0,
      mockupConfigVerticalSkewY: mockupConfigVertical.skewY ?? 0,
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

    // Build horizontal mockup config JSON
    const mockupConfig = JSON.stringify({
      type: formValue.mockupConfigType || 'frame',
      x: formValue.mockupConfigX ?? 12,
      y: formValue.mockupConfigY ?? 15,
      width: formValue.mockupConfigWidth ?? 76,
      height: formValue.mockupConfigHeight ?? 70,
      rotation: formValue.mockupConfigRotation ?? 0,
      perspective: formValue.mockupConfigPerspective ?? 0,
      skewX: formValue.mockupConfigSkewX ?? 0,
      skewY: formValue.mockupConfigSkewY ?? 0,
    });

    // Build vertical mockup config JSON
    const mockupConfigVertical = JSON.stringify({
      type: formValue.mockupConfigVerticalType || 'frame',
      x: formValue.mockupConfigVerticalX ?? 12,
      y: formValue.mockupConfigVerticalY ?? 15,
      width: formValue.mockupConfigVerticalWidth ?? 76,
      height: formValue.mockupConfigVerticalHeight ?? 70,
      rotation: formValue.mockupConfigVerticalRotation ?? 0,
      perspective: formValue.mockupConfigVerticalPerspective ?? 0,
      skewX: formValue.mockupConfigVerticalSkewX ?? 0,
      skewY: formValue.mockupConfigVerticalSkewY ?? 0,
    });

    const frameData = {
      slug: formValue.slug,
      name: formValue.name,
      nameEn: formValue.nameEn,
      nameFr: formValue.nameFr,
      priceAmount: Math.round(formValue.priceAmount * 100),
      colorCode: formValue.colorCode,
      frameImage: formValue.frameImage,
      frameImageLarge: formValue.frameImageLarge,
      mockupTemplate: formValue.mockupTemplate,
      mockupConfig: mockupConfig,
      mockupTemplateVertical: formValue.mockupTemplateVertical,
      mockupConfigVertical: mockupConfigVertical,
      isActive: formValue.isActive,
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

  onMockupTemplateVerticalSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadingMockupTemplateVertical = true;
      this.imageUploadService.upload(input.files[0]).subscribe({
        next: (response) => {
          this.frameForm.patchValue({ mockupTemplateVertical: response.imageUrl });
          this.uploadingMockupTemplateVertical = false;
          this.toastrService.success('Dikey mockup template yüklendi', 'Başarılı');
        },
        error: (error) => {
          console.error('Vertical mockup template upload error:', error);
          this.uploadingMockupTemplateVertical = false;
          this.toastrService.danger('Görsel yüklenemedi', 'Hata');
        },
      });
    }
  }

  // ==================== MOCKUP EDITOR HELPERS ====================

  getLandscapeMockupConfig(): MockupConfig {
    return {
      type: this.frameForm.get('mockupConfigType')?.value || 'frame',
      x: this.frameForm.get('mockupConfigX')?.value ?? 12,
      y: this.frameForm.get('mockupConfigY')?.value ?? 15,
      width: this.frameForm.get('mockupConfigWidth')?.value ?? 76,
      height: this.frameForm.get('mockupConfigHeight')?.value ?? 70,
      rotation: this.frameForm.get('mockupConfigRotation')?.value ?? 0,
      perspective: this.frameForm.get('mockupConfigPerspective')?.value ?? 0,
      skewX: this.frameForm.get('mockupConfigSkewX')?.value ?? 0,
      skewY: this.frameForm.get('mockupConfigSkewY')?.value ?? 0,
    };
  }

  onLandscapeMockupConfigChange(config: MockupConfig): void {
    this.frameForm.patchValue({
      mockupConfigType: config.type,
      mockupConfigX: config.x,
      mockupConfigY: config.y,
      mockupConfigWidth: config.width,
      mockupConfigHeight: config.height,
      mockupConfigRotation: config.rotation,
      mockupConfigPerspective: config.perspective,
      mockupConfigSkewX: config.skewX,
      mockupConfigSkewY: config.skewY,
    });
  }

  getVerticalMockupConfig(): MockupConfig {
    return {
      type: this.frameForm.get('mockupConfigVerticalType')?.value || 'frame',
      x: this.frameForm.get('mockupConfigVerticalX')?.value ?? 12,
      y: this.frameForm.get('mockupConfigVerticalY')?.value ?? 15,
      width: this.frameForm.get('mockupConfigVerticalWidth')?.value ?? 76,
      height: this.frameForm.get('mockupConfigVerticalHeight')?.value ?? 70,
      rotation: this.frameForm.get('mockupConfigVerticalRotation')?.value ?? 0,
      perspective: this.frameForm.get('mockupConfigVerticalPerspective')?.value ?? 0,
      skewX: this.frameForm.get('mockupConfigVerticalSkewX')?.value ?? 0,
      skewY: this.frameForm.get('mockupConfigVerticalSkewY')?.value ?? 0,
    };
  }

  onVerticalMockupConfigChange(config: MockupConfig): void {
    this.frameForm.patchValue({
      mockupConfigVerticalType: config.type,
      mockupConfigVerticalX: config.x,
      mockupConfigVerticalY: config.y,
      mockupConfigVerticalWidth: config.width,
      mockupConfigVerticalHeight: config.height,
      mockupConfigVerticalRotation: config.rotation,
      mockupConfigVerticalPerspective: config.perspective,
      mockupConfigVerticalSkewX: config.skewX,
      mockupConfigVerticalSkewY: config.skewY,
    });
  }

  openImage(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }
}
