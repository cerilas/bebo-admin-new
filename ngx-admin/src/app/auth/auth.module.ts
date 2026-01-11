import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import {
  NbCardModule,
  NbButtonModule,
  NbInputModule,
  NbIconModule,
  NbAlertModule,
  NbSpinnerModule,
  NbCheckboxModule,
  NbTooltipModule,
} from '@nebular/theme';

import { LoginComponent } from './login/login.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbIconModule,
    NbAlertModule,
    NbSpinnerModule,
    NbCheckboxModule,
    NbTooltipModule,
  ],
  declarations: [
    LoginComponent
  ]
})
export class AuthModule { }
