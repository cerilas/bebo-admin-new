import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  NbCardModule, 
  NbButtonModule, 
  NbInputModule, 
  NbIconModule,
  NbSelectModule,
  NbDialogModule,
  NbSpinnerModule,
  NbTooltipModule,
} from '@nebular/theme';

import { UsersRoutingModule } from './users-routing.module';
import { UsersComponent } from './users.component';
import { UserListComponent } from './user-list/user-list.component';
import { UserDetailComponent } from './user-detail/user-detail.component';

@NgModule({
  declarations: [
    UsersComponent,
    UserListComponent,
    UserDetailComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    UsersRoutingModule,
    NbCardModule,
    NbButtonModule,
    NbInputModule,
    NbIconModule,
    NbSelectModule,
    NbDialogModule.forChild(),
    NbSpinnerModule,
    NbTooltipModule,
  ],
})
export class UsersModule { }
