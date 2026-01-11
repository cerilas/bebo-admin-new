import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  NbCardModule,
  NbButtonModule,
  NbInputModule,
  NbIconModule,
  NbSpinnerModule,
  NbTooltipModule,
} from '@nebular/theme';

import { SiteSettingsRoutingModule } from './site-settings-routing.module';
import { SiteSettingsComponent } from './site-settings.component';

@NgModule({
  declarations: [SiteSettingsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SiteSettingsRoutingModule,
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbIconModule,
    NbSpinnerModule,
    NbTooltipModule,
  ],
})
export class SiteSettingsModule {}
