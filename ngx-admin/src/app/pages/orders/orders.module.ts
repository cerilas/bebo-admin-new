import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  NbCardModule, 
  NbButtonModule, 
  NbInputModule, 
  NbIconModule, 
  NbSelectModule,
  NbBadgeModule,
  NbSpinnerModule,
  NbDialogModule
} from '@nebular/theme';

import { ThemeModule } from '../../@theme/theme.module';
import { OrdersRoutingModule } from './orders-routing.module';
import { OrdersComponent } from './orders.component';
import { OrderListComponent } from './order-list/order-list.component';
import { OrderDetailComponent } from './order-detail/order-detail.component';

@NgModule({
  declarations: [
    OrdersComponent,
    OrderListComponent,
    OrderDetailComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    OrdersRoutingModule,
    ThemeModule,
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbIconModule,
    NbSelectModule,
    NbBadgeModule,
    NbSpinnerModule,
    NbDialogModule.forChild(),
  ],
})
export class OrdersModule { }
