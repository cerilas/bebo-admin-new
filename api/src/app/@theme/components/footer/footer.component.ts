import { Component } from '@angular/core';

@Component({
  selector: 'ngx-footer',
  styleUrls: ['./footer.component.scss'],
  template: `
    <span class="created-by">
      <b>Birebiro</b> Yönetim Paneli © {{ currentYear }}
    </span>
    <div class="socials">
      <a href="https://birebiro.com" target="_blank" class="ion ion-ios-world"></a>
      <a href="https://instagram.com/birebiro" target="_blank" class="ion ion-social-instagram"></a>
    </div>
  `,
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
