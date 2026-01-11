import { Component, OnInit } from '@angular/core';
import { NbDialogService } from '@nebular/theme';
import { OrdersService } from '../../../@core/services';
import { Order } from '../../../@core/models';
import { OrderDetailComponent } from '../order-detail/order-detail.component';

@Component({
  selector: 'ngx-order-list',
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.scss'],
})
export class OrderListComponent implements OnInit {
  source: Order[] = [];
  filteredOrders: Order[] = [];
  paginatedOrders: Order[] = [];
  loading = true;
  Math = Math;

  // Filtreleme
  searchTerm = '';
  paymentStatusFilter = '';
  shippingStatusFilter = '';

  // Pagination
  currentPage = 1;
  pageSize = 25;
  totalPages = 1;
  visiblePages: number[] = [];

  // Sorting
  sortField: 'id' | 'createdAt' | 'totalAmount' = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  get totalOrders(): number {
    return this.source.length;
  }

  constructor(
    private ordersService: OrdersService,
    private dialogService: NbDialogService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.ordersService.getAll().subscribe({
      next: (orders) => {
        this.source = orders;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Siparişler yüklenirken hata:', error);
        this.loading = false;
      },
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.paymentStatusFilter = '';
    this.shippingStatusFilter = '';
    this.currentPage = 1;
    this.pageSize = 25;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.source];

    // Arama filtresi
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toString().includes(search) ||
        order.userId?.toLowerCase().includes(search) ||
        order.customerName?.toLowerCase().includes(search) ||
        order.customerEmail?.toLowerCase().includes(search) ||
        order.productName?.toLowerCase().includes(search)
      );
    }

    // Ödeme durumu filtresi
    if (this.paymentStatusFilter) {
      filtered = filtered.filter(order => order.paymentStatus === this.paymentStatusFilter);
    }

    // Kargo durumu filtresi
    if (this.shippingStatusFilter) {
      filtered = filtered.filter(order => order.shippingStatus === this.shippingStatusFilter);
    }

    // Sıralama
    filtered = this.sortOrders(filtered);

    this.filteredOrders = filtered;
    this.calculatePagination();
  }

  sortOrders(orders: Order[]): Order[] {
    return orders.sort((a, b) => {
      let compareValue = 0;

      switch (this.sortField) {
        case 'id':
          compareValue = a.id - b.id;
          break;
        case 'totalAmount':
          compareValue = (a.totalAmount || 0) - (b.totalAmount || 0);
          break;
        case 'createdAt':
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          compareValue = dateA - dateB;
          break;
      }

      return this.sortDirection === 'asc' ? compareValue : -compareValue;
    });
  }

  sortBy(field: 'id' | 'createdAt' | 'totalAmount'): void {
    if (this.sortField === field) {
      // Aynı alana tıklandıysa yönü değiştir
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Farklı alana tıklandıysa o alanı seç ve desc yap
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    this.applyFilters();
  }

  getSortIcon(field: 'id' | 'createdAt' | 'totalAmount'): string {
    if (this.sortField !== field) {
      return 'swap-outline'; // Varsayılan ikon
    }
    return this.sortDirection === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline';
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
    
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedOrders = this.filteredOrders.slice(startIndex, endIndex);

    this.calculateVisiblePages();
  }

  calculateVisiblePages(): void {
    const maxVisiblePages = 5;
    const pages: number[] = [];

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, this.currentPage - halfVisible);
      let endPage = Math.min(this.totalPages, this.currentPage + halfVisible);

      if (this.currentPage <= halfVisible) {
        endPage = maxVisiblePages;
      } else if (this.currentPage >= this.totalPages - halfVisible) {
        startPage = this.totalPages - maxVisiblePages + 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    this.visiblePages = pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.calculatePagination();
    }
  }

  getPaymentStatusText(status: string): string {
    const statusMap = {
      pending: 'Bekliyor',
      success: 'Başarılı',
      failed: 'Başarısız',
      refunded: 'İade Edildi',
    };
    return statusMap[status] || status;
  }

  getPaymentStatusBadge(status: string): string {
    const statusMap = {
      pending: 'warning',
      success: 'success',
      failed: 'danger',
      refunded: 'info',
    };
    return statusMap[status] || 'basic';
  }

  getShippingStatusText(status: string): string {
    const statusMap = {
      pending: 'Bekliyor',
      preparing: 'Hazırlanıyor',
      shipped: 'Kargoda',
      delivered: 'Teslim Edildi',
      cancelled: 'İptal',
    };
    return statusMap[status] || status;
  }

  getShippingStatusBadge(status: string): string {
    const statusMap = {
      pending: 'warning',
      preparing: 'info',
      shipped: 'primary',
      delivered: 'success',
      cancelled: 'danger',
    };
    return statusMap[status] || 'basic';
  }

  openOrderDetail(orderId: number): void {
    this.dialogService.open(OrderDetailComponent, {
      context: {
        orderId: orderId,
      },
      closeOnBackdropClick: false,
      hasScroll: true,
      autoFocus: true,
      dialogClass: 'fullscreen-dialog',
    }).onClose.subscribe((hasChanges: boolean) => {
      // Sadece değişiklik olduysa listeyi yenile
      if (hasChanges) {
        this.loadOrders();
      }
    });
  }
}
