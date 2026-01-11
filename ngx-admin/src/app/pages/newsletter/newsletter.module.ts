import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  NbCardModule, 
  NbButtonModule, 
  NbIconModule, 
  NbInputModule, 
  NbSelectModule,
  NbSpinnerModule,
} from '@nebular/theme';

import { NewsletterRoutingModule } from './newsletter-routing.module';
import { NewsletterComponent } from './newsletter.component';
import { SubscriberListComponent } from './subscriber-list/subscriber-list.component';

@NgModule({
  declarations: [
    NewsletterComponent,
    SubscriberListComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    NewsletterRoutingModule,
    NbCardModule,
    NbButtonModule,
    NbIconModule,
    NbInputModule,
    NbSelectModule,
    NbSpinnerModule,
  ],
})
export class NewsletterModule { }
