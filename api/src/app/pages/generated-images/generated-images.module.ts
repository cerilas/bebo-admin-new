import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  NbCardModule, 
  NbButtonModule, 
  NbInputModule, 
  NbIconModule,
  NbSelectModule,
  NbTooltipModule,
  NbSpinnerModule,
} from '@nebular/theme';

import { GeneratedImagesRoutingModule } from './generated-images-routing.module';
import { GeneratedImagesComponent } from './generated-images.component';
import { ImageListComponent } from './image-list/image-list.component';

@NgModule({
  declarations: [
    GeneratedImagesComponent,
    ImageListComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    GeneratedImagesRoutingModule,
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbIconModule,
    NbSelectModule,
    NbTooltipModule,
    NbSpinnerModule,
  ],
})
export class GeneratedImagesModule { }
