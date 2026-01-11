import { Component, OnInit } from '@angular/core';
import { GeneratedImagesService, ImageStats, ProductOption } from '../../../@core/services/generated-images.service';
import { GeneratedImage } from '../../../@core/models';

@Component({
  selector: 'ngx-image-list',
  templateUrl: './image-list.component.html',
  styleUrls: ['./image-list.component.scss'],
})
export class ImageListComponent implements OnInit {
  images: GeneratedImage[] = [];
  stats: ImageStats = {
    totalImages: 0,
    totalCredits: 0,
    selectedImages: 0,
    uniqueUsers: 0,
    today: 0,
    thisWeek: 0,
    generateMode: 0,
    inspirationMode: 0,
  };
  products: ProductOption[] = [];
  
  loading = true;
  searchQuery = '';
  selectedProductId: number | null = null;
  selectedFilter: 'all' | 'selected' | 'not-selected' = 'all';
  
  // Modal
  selectedImage: GeneratedImage | null = null;
  showModal = false;
  
  // Pagination
  limit = 50;
  offset = 0;
  hasMore = true;

  constructor(private imagesService: GeneratedImagesService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadProducts();
    this.loadImages();
  }

  loadStats(): void {
    this.imagesService.getStats().subscribe({
      next: (stats) => {
        this.stats = {
          totalImages: parseInt(stats.totalImages as any) || 0,
          totalCredits: parseInt(stats.totalCredits as any) || 0,
          selectedImages: parseInt(stats.selectedImages as any) || 0,
          uniqueUsers: parseInt(stats.uniqueUsers as any) || 0,
          today: parseInt(stats.today as any) || 0,
          thisWeek: parseInt(stats.thisWeek as any) || 0,
          generateMode: parseInt(stats.generateMode as any) || 0,
          inspirationMode: parseInt(stats.inspirationMode as any) || 0,
        };
      },
      error: (err) => console.error('Stats load error:', err),
    });
  }

  loadProducts(): void {
    this.imagesService.getProductOptions().subscribe({
      next: (products) => {
        this.products = products;
      },
      error: (err) => console.error('Products load error:', err),
    });
  }

  loadImages(append = false): void {
    if (!append) {
      this.loading = true;
      this.offset = 0;
    }
    
    const isSelected = this.selectedFilter === 'selected' ? true : 
                       this.selectedFilter === 'not-selected' ? false : undefined;
    
    this.imagesService.getAll({
      search: this.searchQuery || undefined,
      productId: this.selectedProductId || undefined,
      isSelected,
      limit: this.limit,
      offset: this.offset,
    }).subscribe({
      next: (images) => {
        if (append) {
          this.images = [...this.images, ...images];
        } else {
          this.images = images;
        }
        this.hasMore = images.length === this.limit;
        this.loading = false;
      },
      error: (error) => {
        console.error('Görseller yüklenirken hata:', error);
        this.loading = false;
      },
    });
  }

  loadMore(): void {
    this.offset += this.limit;
    this.loadImages(true);
  }

  setFilter(filter: 'all' | 'selected' | 'not-selected'): void {
    this.selectedFilter = filter;
    this.loadImages();
  }

  onProductChange(): void {
    this.loadImages();
  }

  onSearch(): void {
    this.loadImages();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadImages();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedProductId = null;
    this.selectedFilter = 'all';
    this.loadImages();
  }

  openDetail(image: GeneratedImage): void {
    this.selectedImage = image;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedImage = null;
  }

  deleteImage(image: GeneratedImage): void {
    if (!confirm(`Bu görseli silmek istediğinize emin misiniz?`)) {
      return;
    }

    this.imagesService.deleteImage(image.id).subscribe({
      next: () => {
        this.images = this.images.filter(img => img.id !== image.id);
        this.loadStats();
        if (this.selectedImage?.id === image.id) {
          this.closeModal();
        }
      },
      error: (err) => console.error('Silme hatası:', err),
    });
  }

  getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR');
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getUserName(image: GeneratedImage): string {
    if ((image as any).userName) {
      return (image as any).userName;
    }
    return image.userEmail || image.userId;
  }

  downloadImage(url: string): void {
    window.open(url, '_blank');
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }
}
