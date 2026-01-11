import { Component, OnInit } from '@angular/core';
import { ContactSubmissionsService, ContactStats } from '../../../@core/services/contact-submissions.service';
import { ContactSubmission } from '../../../@core/models';

@Component({
  selector: 'ngx-submission-list',
  templateUrl: './submission-list.component.html',
  styleUrls: ['./submission-list.component.scss'],
})
export class SubmissionListComponent implements OnInit {
  submissions: ContactSubmission[] = [];
  stats: ContactStats = {
    total: 0,
    unread: 0,
    read: 0,
    replied: 0,
    notReplied: 0,
    today: 0,
    thisWeek: 0,
  };
  
  loading = true;
  searchQuery = '';
  activeFilter: 'all' | 'unread' | 'read' | 'replied' | 'not-replied' = 'all';
  
  // Modal
  selectedSubmission: ContactSubmission | null = null;
  showModal = false;

  constructor(private contactService: ContactSubmissionsService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadSubmissions();
  }

  loadStats(): void {
    this.contactService.getStats().subscribe({
      next: (stats) => {
        this.stats = {
          total: parseInt(stats.total as any) || 0,
          unread: parseInt(stats.unread as any) || 0,
          read: parseInt(stats.read as any) || 0,
          replied: parseInt(stats.replied as any) || 0,
          notReplied: parseInt(stats.notReplied as any) || 0,
          today: parseInt(stats.today as any) || 0,
          thisWeek: parseInt(stats.thisWeek as any) || 0,
        };
      },
      error: (err) => console.error('Stats load error:', err),
    });
  }

  loadSubmissions(): void {
    this.loading = true;
    this.contactService.getAll(this.activeFilter, this.searchQuery).subscribe({
      next: (submissions) => {
        this.submissions = submissions;
        this.loading = false;
      },
      error: (error) => {
        console.error('Mesajlar yüklenirken hata:', error);
        this.loading = false;
      },
    });
  }

  setFilter(filter: 'all' | 'unread' | 'read' | 'replied' | 'not-replied'): void {
    this.activeFilter = filter;
    this.loadSubmissions();
  }

  onSearch(): void {
    this.loadSubmissions();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadSubmissions();
  }

  openDetail(submission: ContactSubmission): void {
    this.selectedSubmission = submission;
    this.showModal = true;
    
    // Okunmadıysa okundu olarak işaretle
    if (!submission.isRead) {
      this.markAsRead(submission);
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedSubmission = null;
  }

  markAsRead(submission: ContactSubmission): void {
    this.contactService.markAsRead(submission.id).subscribe({
      next: () => {
        submission.isRead = true;
        this.loadStats();
      },
      error: (err) => console.error('Okundu işaretleme hatası:', err),
    });
  }

  markAsReplied(submission: ContactSubmission): void {
    this.contactService.markAsReplied(submission.id).subscribe({
      next: () => {
        submission.isReplied = true;
        submission.isRead = true;
        this.loadStats();
      },
      error: (err) => console.error('Yanıtlandı işaretleme hatası:', err),
    });
  }

  deleteSubmission(submission: ContactSubmission): void {
    if (!confirm(`"${submission.name}" kişisinden gelen mesajı silmek istediğinize emin misiniz?`)) {
      return;
    }

    this.contactService.deleteSubmission(submission.id).subscribe({
      next: () => {
        this.submissions = this.submissions.filter(s => s.id !== submission.id);
        this.loadStats();
        if (this.selectedSubmission?.id === submission.id) {
          this.closeModal();
        }
      },
      error: (err) => console.error('Silme hatası:', err),
    });
  }

  markAllAsRead(): void {
    const unreadIds = this.submissions.filter(s => !s.isRead).map(s => s.id);
    if (unreadIds.length === 0) return;

    this.contactService.bulkMarkAsRead(unreadIds).subscribe({
      next: () => {
        this.submissions.forEach(s => s.isRead = true);
        this.loadStats();
      },
      error: (err) => console.error('Toplu okundu işaretleme hatası:', err),
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

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }
}
