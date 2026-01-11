import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AboutComponent } from './about.component';
import { AboutContentComponent } from './about-content/about-content.component';

const routes: Routes = [{
  path: '',
  component: AboutComponent,
  children: [
    {
      path: '',
      component: AboutContentComponent,
    },
  ],
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AboutRoutingModule { }
