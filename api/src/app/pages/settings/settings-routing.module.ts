import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { CreditSettingsComponent } from './credit-settings/credit-settings.component';
import { AboutSettingsComponent } from './about-settings/about-settings.component';

const routes: Routes = [{
  path: '',
  component: SettingsComponent,
  children: [
    {
      path: '',
      redirectTo: 'credit',
      pathMatch: 'full',
    },
    {
      path: 'credit',
      component: CreditSettingsComponent,
    },
    {
      path: 'about',
      component: AboutSettingsComponent,
    },
  ],
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule { }
