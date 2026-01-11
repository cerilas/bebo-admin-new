import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NbCardModule, NbButtonModule, NbTabsetModule } from '@nebular/theme';

import { AboutRoutingModule } from './about-routing.module';
import { AboutComponent } from './about.component';
import { AboutContentComponent } from './about-content/about-content.component';

@NgModule({
  declarations: [
    AboutComponent,
    AboutContentComponent,
  ],
  imports: [
    CommonModule,
    AboutRoutingModule,
    NbCardModule,
    NbButtonModule,
    NbTabsetModule,
  ],
})
export class AboutModule { }
