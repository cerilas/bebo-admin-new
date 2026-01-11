import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OrdersComponent } from './orders.component';
import { OrderListComponent } from './order-list/order-list.component';

const routes: Routes = [{
  path: '',
  component: OrdersComponent,
  children: [
    {
      path: '',
      component: OrderListComponent,
    },
  ],
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrdersRoutingModule { }
