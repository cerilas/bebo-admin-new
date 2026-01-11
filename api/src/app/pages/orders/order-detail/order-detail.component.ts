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
    this.loadOrderDetail();
  }

  loadOrderDetail() {
    this.loading = true;
    this.error = null;

    this.ordersService.getOrder(this.orderId).subscribe({
      next: (data) => {
        this.order = data;
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

  downloadGeneratedImage(): void {
    if (!this.order?.generatedImageUrl) {
      return;
    }

    // Görsel URL'sinden dosyayı indir
    // productionImageUrl varsa onu kullan (watermarksız), yoksa generatedImageUrl (watermarklı)
    const imageUrl = this.order.productionImageUrl || this.order.generatedImageUrl;
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

  close() {
    // Sadece değişiklik olduysa true döndür
    this.ref.close(this.hasChanges);
  }
}
