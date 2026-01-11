import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NbCardModule, NbButtonModule, NbInputModule, NbSelectModule, NbCheckboxModule, NbIconModule, NbSpinnerModule } from '@nebular/theme';
import { Ng2SmartTableModule } from 'ng2-smart-table';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { LegalDocumentsRoutingModule } from './legal-documents-routing.module';
import { LegalDocumentsComponent } from './legal-documents.component';
import { DocumentListComponent } from './document-list/document-list.component';
import { LegalDocumentsDetailComponent } from './detail/legal-documents-detail.component';

@NgModule({
  declarations: [
    LegalDocumentsComponent,
    DocumentListComponent,
    LegalDocumentsDetailComponent,
  ],
  imports: [
    CommonModule,
    LegalDocumentsRoutingModule,
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbSelectModule,
    NbCheckboxModule,
    NbIconModule,
    NbSpinnerModule,
    Ng2SmartTableModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class LegalDocumentsModule { }
