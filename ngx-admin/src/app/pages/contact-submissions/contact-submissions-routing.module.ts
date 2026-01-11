import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ContactSubmissionsComponent } from './contact-submissions.component';
import { SubmissionListComponent } from './submission-list/submission-list.component';

const routes: Routes = [{
  path: '',
  component: ContactSubmissionsComponent,
  children: [
    {
      path: '',
      component: SubmissionListComponent,
    },
  ],
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContactSubmissionsRoutingModule { }
