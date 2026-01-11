import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  NbCardModule, 
  NbButtonModule, 
  NbInputModule, 
  NbToggleModule, 
  NbIconModule,
  NbSpinnerModule,
} from '@nebular/theme';

import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { CreditSettingsComponent } from './credit-settings/credit-settings.component';
import { AboutSettingsComponent } from './about-settings/about-settings.component';

@NgModule({
  declarations: [
    SettingsComponent,
    CreditSettingsComponent,
    AboutSettingsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SettingsRoutingModule,
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbToggleModule,
    NbIconModule,
    NbSpinnerModule,
  ],
})
export class SettingsModule { }
