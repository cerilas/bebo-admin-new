import { Component, OnInit } from '@angular/core';
import { NewsletterService, NewsletterStats } from '../../../@core/services';
import { NewsletterSubscriber } from '../../../@core/models';

@Component({
  selector: 'ngx-subscriber-list',
  templateUrl: './subscriber-list.component.html',
  styleUrls: ['./subscriber-list.component.scss'],
})
export class SubscriberListComponent implements OnInit {
  subscribers: NewsletterSubscriber[] = [];
  stats: NewsletterStats = {
    total: 0,
    active: 0,
    unsubscribed: 0,
    bounced: 0,
    lastWeek: 0,
    lastMonth: 0,
  };
  
  loading = true;
  error: string = null;
  
  // Filtreler
  statusFilter: string = 'all';
  searchQuery: string = '';
  
  // İşlem durumları
  updatingId: number = null;
  deletingId: number = null;

  constructor(private newsletterService: NewsletterService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    
    // Stats yükle
    this.newsletterService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (err) => console.error('Stats error:', err),
    });
    
    // Aboneleri yükle
    this.loadSubscribers();
  }

  loadSubscribers(): void {
    this.loading = true;
    this.newsletterService.getAll(this.statusFilter, this.searchQuery).subscribe({
      next: (subscribers) => {
        this.subscribers = subscribers;
        this.loading = false;
      },
      error: (error) => {
        console.error('Aboneler yüklenirken hata:', error);
        this.error = 'Aboneler yüklenirken bir hata oluştu.';
        this.loading = false;
      },
    });
  }

  onStatusFilterChange(): void {
    this.loadSubscribers();
  }

  onSearch(): void {
    this.loadSubscribers();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadSubscribers();
  }

  updateStatus(subscriber: NewsletterSubscriber, newStatus: string): void {
    if (subscriber.status === newStatus) return;
    
    this.updatingId = subscriber.id;
    this.newsletterService.updateSubscriberStatus(subscriber.id, newStatus).subscribe({
      next: () => {
        subscriber.status = newStatus as any;
        this.updatingId = null;
        // Stats güncelle
        this.newsletterService.getStats().subscribe(stats => this.stats = stats);
      },
      error: (err) => {
        console.error('Status update error:', err);
        this.updatingId = null;
      },
    });
  }

  deleteSubscriber(subscriber: NewsletterSubscriber): void {
    if (!confirm(`"${subscriber.email}" adresini silmek istediğinize emin misiniz?`)) {
      return;
    }
    
    this.deletingId = subscriber.id;
    this.newsletterService.deleteSubscriber(subscriber.id).subscribe({
      next: () => {
        this.subscribers = this.subscribers.filter(s => s.id !== subscriber.id);
        this.deletingId = null;
        // Stats güncelle
        this.newsletterService.getStats().subscribe(stats => this.stats = stats);
      },
      error: (err) => {
        console.error('Delete error:', err);
        this.deletingId = null;
      },
    });
  }

  exportCSV(): void {
    this.newsletterService.exportSubscribers(this.statusFilter);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'unsubscribed': return 'warning';
      case 'bounced': return 'danger';
      default: return 'basic';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Aktif';
      case 'unsubscribed': return 'Abonelikten Çıktı';
      case 'bounced': return 'Geri Döndü';
      default: return status;
    }
  }
}
