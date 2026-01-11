import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { NewsletterComponent } from './newsletter.component';
import { SubscriberListComponent } from './subscriber-list/subscriber-list.component';

const routes: Routes = [{
  path: '',
  component: NewsletterComponent,
  children: [
    {
      path: '',
      component: SubscriberListComponent,
    },
  ],
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NewsletterRoutingModule { }
