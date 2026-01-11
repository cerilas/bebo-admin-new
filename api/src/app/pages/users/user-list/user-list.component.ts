import { Component, OnInit } from '@angular/core';
import { NbDialogService } from '@nebular/theme';
import { UsersService } from '../../../@core/services';
import { User } from '../../../@core/models';
import { UserDetailComponent } from '../user-detail/user-detail.component';

@Component({
  selector: 'ngx-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent implements OnInit {
  source: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  loading = true;
  Math = Math;

  // Filtreleme
  searchTerm = '';

  // Pagination
  currentPage = 1;
  pageSize = 25;
  totalPages = 1;
  visiblePages: number[] = [];

  // Sorting
  sortField: 'artCredits' | 'totalOrders' | 'totalSpent' | 'createdAt' = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(
    private usersService: UsersService,
    private dialogService: NbDialogService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.usersService.getAll().subscribe({
      next: (users) => {
        this.source = users;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Kullanıcılar yüklenirken hata:', error);
        this.loading = false;
      },
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.pageSize = 25;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.source];

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.id?.toLowerCase().includes(search) ||
        user.firstName?.toLowerCase().includes(search) ||
        user.lastName?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.phone?.toLowerCase().includes(search) ||
        user.customerName?.toLowerCase().includes(search) ||
        user.customerEmail?.toLowerCase().includes(search) ||
        user.customerPhone?.toLowerCase().includes(search)
      );
    }

    filtered = this.sortUsers(filtered);
    this.filteredUsers = filtered;
    this.calculatePagination();
  }

  sortUsers(users: User[]): User[] {
    return users.sort((a, b) => {
      let compareValue = 0;

      switch (this.sortField) {
        case 'artCredits':
          compareValue = (a.artCredits || 0) - (b.artCredits || 0);
          break;
        case 'totalOrders':
          compareValue = (a.totalOrders || 0) - (b.totalOrders || 0);
          break;
        case 'totalSpent':
          compareValue = (a.totalSpent || 0) - (b.totalSpent || 0);
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

  sortBy(field: 'artCredits' | 'totalOrders' | 'totalSpent' | 'createdAt'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'swap-outline';
    }
    return this.sortDirection === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline';
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);

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

  openUserDetail(userId: string): void {
    this.dialogService.open(UserDetailComponent, {
      context: {
        userId: userId,
      },
      closeOnBackdropClick: false,
      hasScroll: true,
      autoFocus: true,
      dialogClass: 'fullscreen-dialog',
    }).onClose.subscribe((hasChanges: boolean) => {
      if (hasChanges) {
        this.loadUsers();
      }
    });
  }
}
