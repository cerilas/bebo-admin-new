import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GeneratedImagesComponent } from './generated-images.component';
import { ImageListComponent } from './image-list/image-list.component';

const routes: Routes = [{
  path: '',
  component: GeneratedImagesComponent,
  children: [
    {
      path: '',
      component: ImageListComponent,
    },
  ],
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GeneratedImagesRoutingModule { }
