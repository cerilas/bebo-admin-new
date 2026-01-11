import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NbToastrService } from '@nebular/theme';
import { LegalDocumentsService } from '../../../@core/services';
import { LegalDocument } from '../../../@core/models';

@Component({
  selector: 'ngx-document-list',
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss'],
})
export class DocumentListComponent implements OnInit {
  settings = {
    mode: 'external',
    actions: {
      add: true,
      edit: true,
      delete: true,
      columnTitle: 'İşlemler',
    },
    add: {
      addButtonContent: '<i class="nb-plus"></i>',
      createButtonContent: '<i class="nb-checkmark"></i>',
      cancelButtonContent: '<i class="nb-close"></i>',
    },
    edit: {
      editButtonContent: '<i class="nb-edit"></i>',
      saveButtonContent: '<i class="nb-checkmark"></i>',
      cancelButtonContent: '<i class="nb-close"></i>',
    },
    delete: {
      deleteButtonContent: '<i class="nb-trash"></i>',
      confirmDelete: true,
    },
    columns: {
      id: {
        title: 'ID',
        type: 'number',
        width: '60px',
      },
      title: {
        title: 'Başlık',
        type: 'string',
      },
      language: {
        title: 'Dil',
        type: 'string',
        width: '80px',
        valuePrepareFunction: (value) => value.toUpperCase(),
      },
      slug: {
        title: 'Slug',
        type: 'string',
      },
      type: {
        title: 'Tip',
        type: 'string',
      },
      isActive: {
        title: 'Durum',
        type: 'html',
        valuePrepareFunction: (value) => {
          return value
            ? '<span class="badge badge-success">Aktif</span>'
            : '<span class="badge badge-basic">Pasif</span>';
        },
      },
      updatedAt: {
        title: 'Güncelleme Tarihi',
        type: 'string',
        valuePrepareFunction: (value) => new Date(value).toLocaleDateString('tr-TR'),
      },
    },
  };

  source: LegalDocument[] = [];
  loading = true;

  constructor(
    private legalDocumentsService: LegalDocumentsService,
    private router: Router,
    private toastrService: NbToastrService,
  ) { }

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loading = true;
    this.legalDocumentsService.getAll().subscribe({
      next: (documents) => {
        this.source = documents;
        this.loading = false;
      },
      error: (error) => {
        console.error('Yasal dokümanlar yüklenirken hata:', error);
        this.loading = false;
      },
    });
  }

  onCreate(): void {
    this.router.navigate(['/pages/legal-documents/create']);
  }

  onEdit(event: any): void {
    this.router.navigate([`/pages/legal-documents/edit/${event.data.id}`]);
  }

  onDelete(event: any): void {
    if (window.confirm('Bu dokümanı silmek istediğinizden emin misiniz?')) {
      this.legalDocumentsService.deleteDocument(event.data.id).subscribe({
        next: () => {
          this.toastrService.success('Başarılı', 'Doküman silindi.');
          this.loadDocuments();
        },
        error: (err) => {
          this.toastrService.danger('Hata', 'Silme işlemi başarısız.');
        },
      });
    }
  }
}
