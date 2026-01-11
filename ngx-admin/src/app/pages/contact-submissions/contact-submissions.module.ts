import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  NbCardModule, 
  NbButtonModule, 
  NbIconModule, 
  NbInputModule,
  NbTooltipModule,
  NbSpinnerModule,
} from '@nebular/theme';

import { ContactSubmissionsRoutingModule } from './contact-submissions-routing.module';
import { ContactSubmissionsComponent } from './contact-submissions.component';
import { SubmissionListComponent } from './submission-list/submission-list.component';

@NgModule({
  declarations: [
    ContactSubmissionsComponent,
    SubmissionListComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ContactSubmissionsRoutingModule,
    NbCardModule,
    NbButtonModule,
    NbIconModule,
    NbInputModule,
    NbTooltipModule,
    NbSpinnerModule,
  ],
})
export class ContactSubmissionsModule { }
