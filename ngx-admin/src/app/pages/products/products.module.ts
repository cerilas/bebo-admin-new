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

import { ThemeModule } from '../../@theme/theme.module';
import { ProductsRoutingModule } from './products-routing.module';
import { ProductsComponent } from './products.component';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductFormComponent } from './product-form/product-form.component';
import { MockupEditorComponent } from './mockup-editor/mockup-editor.component';
import { AdminImageUploadComponent } from '../../@theme/components/admin-image-upload/admin-image-upload.component';

@NgModule({
  declarations: [
    ProductsComponent,
    ProductListComponent,
    ProductFormComponent,
    MockupEditorComponent,
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
    AdminImageUploadComponent,
  ],
})
export class ProductsModule { }
