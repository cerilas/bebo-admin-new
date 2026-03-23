import { Component, Input, OnInit } from '@angular/core';
import { NbDialogRef, NbToastrService } from '@nebular/theme';
import { OrdersService } from '../../../@core/services/orders.service';

@Component({
  selector: 'ngx-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit {
  @Input() orderId: number;

  order: any = null;
  loading = true;
  saving = false;
  refunding = false;
  error: string = null;
  hasChanges = false; // Güncelleme yapıldı mı?
  imageLoading = true; // Görsel yükleniyor mu?
  productionImageLoading = true; // Üretim görseli yükleniyor mu?

  // Upscale (Üretim Görseli)
  upscaling = false;

  // Refund dialog
  showRefundConfirm = false;
  refundReason = '';

  // Form models
  trackingNumber: string = '';
  shippingStatus: string = '';
  notes: string = '';

  shippingStatuses = [
    { value: 'pending', label: 'Beklemede' },
    { value: 'preparing', label: 'Hazırlanıyor' },
    { value: 'shipped', label: 'Kargoya Verildi' },
    { value: 'delivered', label: 'Teslim Edildi' },
    { value: 'cancelled', label: 'İptal Edildi' }
  ];

  constructor(
    protected ref: NbDialogRef<OrderDetailComponent>,
    private ordersService: OrdersService,
    private toastrService: NbToastrService
  ) { }

  ngOnInit() {
    // Load order details on component initialization
    this.loadOrderDetail();
  }

  loadOrderDetail() {
    this.loading = true;
    this.error = null;

    this.ordersService.getOrder(this.orderId).subscribe({
      next: (data) => {
        this.order = data;
        this.imageLoading = !!this.getPreviewImageUrl(data);
        this.trackingNumber = data.trackingNumber || '';
        this.shippingStatus = data.shippingStatus || 'pending';
        this.notes = data.notes || '';
        this.loading = false;
      },
      error: (err) => {
        console.error('Order detail error:', err);
        this.error = 'Sipariş detayları yüklenirken hata oluştu.';
        this.loading = false;
      }
    });
  }

  updateShipping() {
    if (!this.trackingNumber && !this.shippingStatus) {
      return;
    }

    this.saving = true;
    this.ordersService.updateOrderShippingStatus(
      this.orderId,
      this.shippingStatus,
      this.trackingNumber
    ).subscribe({
      next: () => {
        this.saving = false;
        this.hasChanges = true; // Değişiklik oldu
        this.loadOrderDetail();
      },
      error: (err) => {
        console.error('Shipping update error:', err);
        this.error = 'Kargo bilgileri güncellenirken hata oluştu.';
        this.saving = false;
      }
    });
  }

  updateNotes() {
    if (!this.notes) {
      return;
    }

    this.saving = true;
    this.ordersService.updateOrderNotes(this.orderId, this.notes).subscribe({
      next: () => {
        this.saving = false;
        this.hasChanges = true; // Değişiklik oldu
        this.loadOrderDetail();
      },
      error: (err) => {
        console.error('Notes update error:', err);
        this.error = 'Notlar güncellenirken hata oluştu.';
        this.saving = false;
      }
    });
  }

  getStatusBadge(status: string): string {
    const badges = {
      'pending': 'warning',
      'success': 'success',
      'failed': 'danger',
      'refunded': 'info',
      'preparing': 'info',
      'shipped': 'primary',
      'delivered': 'success',
      'cancelled': 'danger'
    };
    return badges[status] || 'basic';
  }

  getStatusText(status: string): string {
    const texts = {
      // Payment statuses
      'pending': 'Bekliyor',
      'success': 'Başarılı',
      'failed': 'Başarısız',
      'refunded': 'İade Edildi',
      // Shipping statuses
      'preparing': 'Hazırlanıyor',
      'shipped': 'Kargoda',
      'delivered': 'Teslim Edildi',
      'cancelled': 'İptal Edildi'
    };
    return texts[status] || status;
  }

  getOrderTotal(order: any): number {
    // Öncelik sırası: totalAmount -> paymentAmount -> (sizePrice + framePrice)
    let total = 0;
    if (order.totalAmount != null) {
      total = order.totalAmount;
    } else if (order.paymentAmount != null) {
      total = order.paymentAmount;
    } else if (order.orderType === 'product') {
      // Fiziksel ürün ise fiyatları topla
      total = (order.sizePrice || 0) + (order.framePrice || 0);
    }
    // Kuruştan TL'ye çevir (100 kuruş = 1 TL)
    return total / 100;
  }

  // Kuruştan TL'ye çevirme helper metodu
  kurusToTl(kurus: number | null | undefined): number {
    if (kurus == null) return 0;
    return kurus / 100;
  }

  // ==================== IMAGE TRANSFORM (GÖRSEL KONUMLANDIRMA) ====================
  /**
   * image_transform JSON string'ini parse eder
   * Format: {"x": number, "y": number, "scale": number}
   */
  getImageTransform(): { x: number, y: number, scale: number } | null {
    if (!this.order?.imageTransform) return null;
    try {
      const transform = typeof this.order.imageTransform === 'string'
        ? JSON.parse(this.order.imageTransform)
        : this.order.imageTransform;
      return {
        x: transform.x ?? 0,
        y: transform.y ?? 0,
        scale: transform.scale ?? 1
      };
    } catch (e) {
      console.error('Image transform parse error:', e);
      return null;
    }
  }

  /**
   * Transform uygulanmış mı kontrol eder
   * scale !== 1 veya x/y !== 0 ise transform uygulanmıştır
   */
  hasImageTransform(): boolean {
    const transform = this.getImageTransform();
    if (!transform) return false;
    return transform.scale !== 1 || transform.x !== 0 || transform.y !== 0;
  }

  /**
   * Scale değerini yüzde formatında döndürür
   * Örn: 1.5 -> "%150"
   */
  getScalePercent(): string {
    const transform = this.getImageTransform();
    if (!transform) return '%100';
    return `%${Math.round(transform.scale * 100)}`;
  }

  /**
   * Pozisyon değerini formatlar
   * Örn: 10 -> "+10%", -5 -> "-5%", 0 -> "0%"
   */
  formatPosition(value: number): string {
    if (value === 0) return '0%';
    return value > 0 ? `+${value}%` : `${value}%`;
  }

  /**
   * Scale tipini döndürür (baskı için önemli)
   * scale = 1: Tam sığdırılmış (crop yok)
   * scale > 1: Büyütülmüş (crop var)
   * scale < 1: Küçültülmüş (boşluk var)
   */
  getScaleType(): string {
    const transform = this.getImageTransform();
    if (!transform) return 'normal';
    if (transform.scale === 1) return 'Tam Sığdırılmış';
    if (transform.scale > 1) return 'Yakınlaştırılmış';
    return 'Küçültülmüş';
  }

  calculateCreditsFromAmount(amountInTL: number): number {
    // Kredi fiyatlandırması - amountInTL zaten TL cinsinden (getOrderTotal'dan geliyor)
    // 1 kredi = 1.5 TL (150 kuruş) - Birebiro'nun gerçek fiyatlandırması
    const pricePerCreditTL = 1.5;
    if (amountInTL <= 0) return 0;
    return Math.round(amountInTL / pricePerCreditTL);
  }

  onImageError(event: any): void {
    // Görsel yüklenmezse placeholder göster
    event.target.src = 'assets/images/placeholder.png';
  }

  hasProductionImage(order: any = this.order): boolean {
    const imageUrl = order?.productionImageUrl;
    return typeof imageUrl === 'string' ? imageUrl.trim().length > 0 : !!imageUrl;
  }

  // Returns the preview image URL, absolute in production
  getPreviewImageUrl(order: any = this.order): string | null {
    const productionImageUrl = typeof order?.productionImageUrl === 'string'
      ? order.productionImageUrl.trim()
      : order?.productionImageUrl;
    const generatedImageUrl = typeof order?.generatedImageUrl === 'string'
      ? order.generatedImageUrl.trim()
      : order?.generatedImageUrl;
    // Production image takes priority
    const { getAbsoluteImageUrl } = require('../../../@core/utils/image-url.util');
    if (productionImageUrl) {
      return getAbsoluteImageUrl(productionImageUrl, 'admin');
    }
    return getAbsoluteImageUrl(generatedImageUrl || null, 'www');
  }

  // Kullanıcının oluşturduğu orijinal AI görseli (www.birebiro.com'dan çekilir)
  getGeneratedImageUrl(order: any = this.order): string | null {
    const generatedImageUrl = typeof order?.generatedImageUrl === 'string'
      ? order.generatedImageUrl.trim()
      : order?.generatedImageUrl;
    if (!generatedImageUrl) return null;
    const { getAbsoluteImageUrl } = require('../../../@core/utils/image-url.util');
    return getAbsoluteImageUrl(generatedImageUrl, 'www');
  }

  // Replicate upscale sonucu üretim görseli (admin.birebiro.com'dan çekilir)
  getProductionImageUrl(order: any = this.order): string | null {
    const productionImageUrl = typeof order?.productionImageUrl === 'string'
      ? order.productionImageUrl.trim()
      : order?.productionImageUrl;
    if (!productionImageUrl) return null;
    const { getAbsoluteImageUrl } = require('../../../@core/utils/image-url.util');
    return getAbsoluteImageUrl(productionImageUrl, 'admin');
  }

  downloadGeneratedImage(): void {
    if (!this.hasProductionImage()) {
      return;
    }

    // Üretim görselini indir (watermarksız)
    const imageUrl = this.order.productionImageUrl;
    const fileName = `siparis-${this.orderId}-gorsel.png`;

    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Image download error:', error);
        // CORS hatası durumunda yeni sekmede aç
        window.open(imageUrl, '_blank');
      });
  }

  openImageInNewTab(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  copyToClipboard(text: string) {
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      // Başarılı kopyalama feedback'i
      console.log('Kopyalandı:', text);
    }).catch(err => {
      console.error('Kopyalama hatası:', err);
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }

  // ==================== REFUND (İADE) ====================
  showRefundDialog(): void {
    this.showRefundConfirm = true;
    this.refundReason = '';
  }

  cancelRefund(): void {
    this.showRefundConfirm = false;
    this.refundReason = '';
  }

  confirmRefund(): void {
    if (this.refunding) return;

    this.refunding = true;

    // Tam iade yapılacak (amount parametresi gönderilmezse API tam iade yapar)
    this.ordersService.refundOrder(this.orderId, undefined, this.refundReason).subscribe({
      next: (response) => {
        this.refunding = false;
        this.showRefundConfirm = false;

        if (response.success) {
          this.toastrService.success(
            `${response.refundAmount} TL iade edildi`,
            'İade Başarılı',
            { duration: 5000 }
          );
          this.hasChanges = true;
          this.loadOrderDetail(); // Siparişi yeniden yükle
        } else {
          this.toastrService.danger(
            response.error || 'İade işlemi başarısız',
            'Hata',
            { duration: 5000 }
          );
        }
      },
      error: (err) => {
        this.refunding = false;
        console.error('Refund error:', err);
        const errorMsg = err.error?.error || 'İade işlemi sırasında hata oluştu';
        this.toastrService.danger(errorMsg, 'Hata', { duration: 5000 });
      }
    });
  }

  // ==================== KARGO (GELIVER) ====================
  shippingOffers: any[] = [];
  loadingOffers = false;
  acceptingOffer = false;
  showOffers = false;

  loadShippingOffers() {
    this.loadingOffers = true;
    this.showOffers = true;
    this.shippingOffers = [];

    this.ordersService.getShippingOffers(this.orderId).subscribe({
      next: (response) => {
        this.loadingOffers = false;
        // Geliver returns offers nested under data.offers.list
        if (response?.data?.offers?.list && response.data.offers.list.length > 0) {
          this.shippingOffers = response.data.offers.list;
        } else if (response?.offers?.list && response.offers.list.length > 0) {
          // Fallback: direct offers structure
          this.shippingOffers = response.offers.list;
        } else if (response && response.options) {
          this.shippingOffers = response.options;
        } else if (Array.isArray(response)) {
          this.shippingOffers = response;
        } else {
          this.shippingOffers = [];
          this.toastrService.warning('Uygun kargo seçeneği bulunamadı', 'Uyarı');
        }
      },
      error: (err) => {
        this.loadingOffers = false;
        console.error('Shipping offers error:', err);

        // Extract detailed error information
        const errorData = err.error || {};
        const errorMsg = errorData.error || 'Kargo teklifleri alınamadı';
        const errorCode = errorData.errorCode ? ` [${errorData.errorCode}]` : '';
        const details = errorData.details ? `<br><br><strong>Detay:</strong> ${errorData.details}` : '';
        const suggestion = errorData.suggestion ? `<br><br>💡 ${errorData.suggestion}` : '';

        const fullErrorMessage = `${errorMsg}${errorCode}${details}${suggestion}`;

        this.toastrService.danger(
          fullErrorMessage,
          'Kargo Teklifi Hatası',
          {
            duration: 15000,
            preventDuplicates: true,
            destroyByClick: true
          }
        );
      }
    });
  }

  acceptOffer(offer: any) {
    if (this.acceptingOffer) return;

    this.acceptingOffer = true;
    this.ordersService.acceptShippingOffer(this.orderId, offer.id).subscribe({
      next: (response) => {
        this.acceptingOffer = false;
        if (response.success) {
          const trackingCode = response.trackingCode || response.shippingCode || '';
          const carrier = response.providerCode || '';
          this.toastrService.success(
            `Kabul edildi! Takip kodu: ${trackingCode} (${carrier})`,
            'Başarılı'
          );
          this.hasChanges = true;
          this.showOffers = false;
          this.loadOrderDetail(); // Refresh order to see new status
        } else {
          this.toastrService.danger('Kargo teklifi kabul edilemedi', 'Hata');
        }
      },
      error: (err) => {
        this.acceptingOffer = false;
        console.error('Accept offer error:', err);

        // Extract detailed error information from backend response
        const errorData = err.error || {};
        const errorMsg = errorData.error || 'Kargo teklifi kabul edilirken hata oluştu';
        const errorCode = errorData.errorCode ? ` [${errorData.errorCode}]` : '';
        const details = errorData.details ? `<br><br><strong>Detay:</strong> ${errorData.details}` : '';
        const suggestion = errorData.suggestion ? `<br><br>💡 ${errorData.suggestion}` : '';

        // Log debug info if available
        if (errorData.debugInfo) {
          console.log('Debug Info:', errorData.debugInfo);
        }

        // Create comprehensive error message with HTML formatting
        const fullErrorMessage = `${errorMsg}${errorCode}${details}${suggestion}`;

        this.toastrService.danger(
          fullErrorMessage,
          'Kargo Hatası',
          {
            duration: 15000, // Longer duration for detailed messages
            preventDuplicates: true,
            destroyByClick: true // Allow user to dismiss by clicking
          }
        );
      }
    });
  }

  cancelShippingSelection() {
    this.showOffers = false;
    this.shippingOffers = [];
  }

  // ==================== FATURA (PARAŞÜT) ====================
  creatingInvoice = false;

  createInvoice(): void {
    if (this.creatingInvoice) return;

    this.creatingInvoice = true;

    this.ordersService.createInvoice(this.orderId).subscribe({
      next: (response) => {
        this.creatingInvoice = false;
        if (response.success) {
          this.toastrService.success(
            response.message || 'Fatura oluşturuldu',
            'Başarılı',
            { duration: 5000 }
          );
          this.hasChanges = true;
          this.loadOrderDetail(); // Siparişi yeniden yükle

          // Faturayı yeni sekmede aç
          if (response.invoiceUrl) {
            window.open(response.invoiceUrl, '_blank');
          }
        } else {
          this.toastrService.danger(
            response.error || 'Fatura oluşturulamadı',
            'Hata',
            { duration: 5000 }
          );
        }
      },
      error: (err) => {
        this.creatingInvoice = false;
        console.error('Invoice creation error:', err);
        const errorMsg = err.error?.error || 'Fatura oluşturulurken hata oluştu';
        this.toastrService.danger(errorMsg, 'Hata', { duration: 5000 });
      }
    });
  }

  openInvoice(): void {
    if (this.order?.parasutInvoiceId) {
      const url = `https://uygulama.parasut.com/773172/satislar/${this.order.parasutInvoiceId}`;
      window.open(url, '_blank');
    }
  }

  // ==================== ÜRETİM GÖRSELİ (REPLICATE UPSCALE) ====================
  generateProductionImage(): void {
    if (this.upscaling || this.hasProductionImage()) return;

    this.upscaling = true;

    this.ordersService.generateProductionImage(this.orderId).subscribe({
      next: (response) => {
        this.upscaling = false;
        if (response.success) {
          if (response.alreadyExists) {
            this.toastrService.info('Üretim görseli zaten mevcut', 'Bilgi', { duration: 3000 });
          } else {
            this.toastrService.success('Üretim görseli başarıyla oluşturuldu!', 'Başarılı', { duration: 5000 });
          }
          this.hasChanges = true;
          this.loadOrderDetail(); // Siparişi yeniden yükle
        } else {
          this.toastrService.danger(
            response.error || 'Üretim görseli oluşturulamadı',
            'Hata',
            { duration: 5000 }
          );
        }
      },
      error: (err) => {
        this.upscaling = false;
        console.error('Production image generation error:', err);
        const errorMsg = err.error?.error || 'Üretim görseli oluşturulurken hata oluştu';
        const details = err.error?.details ? `\n${err.error.details}` : '';
        this.toastrService.danger(`${errorMsg}${details}`, 'Hata', { duration: 8000 });
      }
    });
  }

  close() {
    // Sadece değişiklik olduysa true döndür
    this.ref.close(this.hasChanges);
  }
}
