import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import {
  NbCardModule,
  NbUserModule,
  NbButtonModule,
  NbButtonGroupModule,
  NbListModule,
  NbIconModule,
  NbBadgeModule,
  NbSelectModule,
} from '@nebular/theme';
import { NgxEchartsModule } from 'ngx-echarts';

import { ThemeModule } from '../../@theme/theme.module';
import { DashboardComponent } from './dashboard.component';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    ThemeModule,
    NbCardModule,
    NbUserModule,
    NbButtonModule,
    NbButtonGroupModule,
    NbListModule,
    NbIconModule,
    NbBadgeModule,
    NbSelectModule,
    NgxEchartsModule,
  ],
  declarations: [
    DashboardComponent,
  ],
})
export class DashboardModule { }
