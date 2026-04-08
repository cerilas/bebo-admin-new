import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  NbCardModule,
  NbButtonModule,
  NbInputModule,
  NbIconModule,
  NbToggleModule,
  NbTabsetModule,
  NbTooltipModule,
  NbSpinnerModule,
  NbSelectModule,
  NbCheckboxModule,
  NbAccordionModule,
  NbAlertModule,
} from '@nebular/theme';

import { CKEditorModule } from 'ng2-ckeditor';
import { ThemeModule } from '../../@theme/theme.module';
import { ProductsRoutingModule } from './products-routing.module';
import { ProductsComponent } from './products.component';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductFormComponent } from './product-form/product-form.component';
import { MockupEditorComponent } from './mockup-editor/mockup-editor.component';
import { ProductDetailEditComponent } from './product-detail-edit/product-detail-edit.component';
import { AdminImageUploadComponent } from '../../@theme/components/admin-image-upload/admin-image-upload.component';

@NgModule({
  declarations: [
    ProductsComponent,
    ProductListComponent,
    ProductFormComponent,
    MockupEditorComponent,
    ProductDetailEditComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProductsRoutingModule,
    ThemeModule,
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbIconModule,
    NbToggleModule,
    NbTabsetModule,
    NbTooltipModule,
    NbSpinnerModule,
    NbSelectModule,
    NbCheckboxModule,
    NbAccordionModule,
    NbAlertModule,
    CKEditorModule,
    AdminImageUploadComponent,
  ],
})
export class ProductsModule { }
