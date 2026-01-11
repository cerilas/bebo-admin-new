import { Component } from '@angular/core';

@Component({
  selector: 'ngx-settings',
  template: `
    <!-- Removed global title so each settings subpage shows its own header -->
    <router-outlet></router-outlet>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    :host ::ng-deep nb-card-header {
      padding: 1rem;
    }
    :host ::ng-deep nb-card-header h5 {
      margin: 0;
    }
    :host ::ng-deep .settings-main-card {
      margin-bottom: 1rem;
    }
  `]
})
export class SettingsComponent {}
