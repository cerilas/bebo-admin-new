import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NbToastrService } from '@nebular/theme';
import { ProductsService, ProductStats, ProductWithDetails } from '../../../@core/services/products.service';

@Component({
  selector: 'ngx-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit {
  products: ProductWithDetails[] = [];
  filteredProducts: ProductWithDetails[] = [];
  stats: ProductStats = {
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    totalSizes: 0,
    totalFrames: 0,
  };
  
  loading = true;
  searchQuery = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  
  // Delete modal
  showDeleteModal = false;
  productToDelete: ProductWithDetails | null = null;

  constructor(
    private productsService: ProductsService,
    private router: Router,
    private toastrService: NbToastrService,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadProducts();
  }

  loadStats(): void {
    this.productsService.getStats().subscribe({
      next: (stats) => {
        this.stats = {
          totalProducts: parseInt(stats.totalProducts as any) || 0,
          activeProducts: parseInt(stats.activeProducts as any) || 0,
          inactiveProducts: parseInt(stats.inactiveProducts as any) || 0,
          totalSizes: parseInt(stats.totalSizes as any) || 0,
          totalFrames: parseInt(stats.totalFrames as any) || 0,
        };
      },
      error: (err) => console.error('Stats load error:', err),
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.productsService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Ürünler yüklenirken hata:', error);
        this.toastrService.danger('Ürünler yüklenemedi', 'Hata');
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    let filtered = [...this.products];
    
    // Status filter
    if (this.statusFilter === 'active') {
      filtered = filtered.filter(p => p.isActive);
    } else if (this.statusFilter === 'inactive') {
      filtered = filtered.filter(p => !p.isActive);
    }
    
    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.nameEn?.toLowerCase().includes(query) ||
        p.slug?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    this.filteredProducts = filtered;
  }

  onSearch(): void {
    this.applyFilters();
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  editProduct(product: ProductWithDetails): void {
    this.router.navigate(['/pages/products/edit', product.id]);
  }

  createProduct(): void {
    this.router.navigate(['/pages/products/create']);
  }

  confirmDelete(product: ProductWithDetails): void {
    this.productToDelete = product;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  deleteProduct(): void {
    if (!this.productToDelete) return;
    
    this.productsService.deleteProduct(this.productToDelete.id).subscribe({
      next: () => {
        this.toastrService.success('Ürün başarıyla silindi', 'Başarılı');
        this.showDeleteModal = false;
        this.productToDelete = null;
        this.loadStats();
        this.loadProducts();
      },
      error: (error) => {
        console.error('Ürün silinirken hata:', error);
        this.toastrService.danger('Ürün silinemedi', 'Hata');
      },
    });
  }

  toggleStatus(product: ProductWithDetails): void {
    this.productsService.updateProduct(product.id, { isActive: !product.isActive }).subscribe({
      next: () => {
        product.isActive = !product.isActive;
        this.toastrService.success(
          product.isActive ? 'Ürün aktif edildi' : 'Ürün pasif edildi',
          'Başarılı'
        );
        this.loadStats();
      },
      error: (error) => {
        console.error('Durum güncellenirken hata:', error);
        this.toastrService.danger('Durum güncellenemedi', 'Hata');
      },
    });
  }

  formatPrice(amount: number | undefined): string {
    if (!amount) return '-';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount / 100);
  }

  getPriceRange(product: ProductWithDetails): string {
    if (!product.minPrice && !product.maxPrice) return 'Fiyat yok';
    if (product.minPrice === product.maxPrice) {
      return this.formatPrice(product.minPrice);
    }
    return `${this.formatPrice(product.minPrice)} - ${this.formatPrice(product.maxPrice)}`;
  }
}
