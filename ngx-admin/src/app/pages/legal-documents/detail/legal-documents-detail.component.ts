import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NbToastrService } from '@nebular/theme';
import { LegalDocumentsService } from '../../../@core/services';
import { LegalDocument } from '../../../@core/models';

@Component({
    selector: 'ngx-legal-documents-detail',
    templateUrl: './legal-documents-detail.component.html',
    styleUrls: ['./legal-documents-detail.component.scss'],
})
export class LegalDocumentsDetailComponent implements OnInit {
    document: Partial<LegalDocument> = {
        isActive: true,
        sortOrder: 0,
        language: 'tr',
    };

    isEditMode = false;
    loading = false;

    languages = [
        { value: 'tr', title: 'Türkçe' },
        { value: 'en', title: 'İngilizce' },
        { value: 'fr', title: 'Fransızca' },
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private legalDocumentsService: LegalDocumentsService,
        private toastrService: NbToastrService,
    ) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode = true;
            this.loadDocument(parseInt(id, 10));
        }
    }

    loadDocument(id: number): void {
        this.loading = true;
        this.legalDocumentsService.getDocument(id).subscribe({
            next: (doc) => {
                this.document = doc;
                this.loading = false;
            },
            error: (err) => {
                this.toastrService.danger('Hata', 'Doküman yüklenirken hata oluştu.');
                this.loading = false;
                this.router.navigate(['/pages/legal-documents']);
            },
        });
    }

    save(): void {
        this.loading = true;
        const observable = this.isEditMode
            ? this.legalDocumentsService.updateDocument(this.document.id!, this.document)
            : this.legalDocumentsService.createDocument(this.document);

        observable.subscribe({
            next: () => {
                this.toastrService.success('Başarılı', `Doküman başarıyla ${this.isEditMode ? 'güncellendi' : 'oluşturuldu'}.`);
                this.router.navigate(['/pages/legal-documents']);
            },
            error: (err) => {
                this.toastrService.danger('Hata', 'Kaydetme işlemi sırasında hata oluştu.');
                this.loading = false;
            },
        });
    }

    back(): void {
        this.router.navigate(['/pages/legal-documents']);
    }
}
