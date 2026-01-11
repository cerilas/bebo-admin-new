import { Component, OnInit } from '@angular/core';
import { AboutContentService } from '../../../@core/services';
import { AboutContent } from '../../../@core/models';

@Component({
  selector: 'ngx-about-content',
  templateUrl: './about-content.component.html',
  styleUrls: ['./about-content.component.scss'],
})
export class AboutContentComponent implements OnInit {
  aboutContent: AboutContent | null = null;
  loading = true;

  constructor(private aboutContentService: AboutContentService) {}

  ngOnInit(): void {
    this.loadAboutContent();
  }

  loadAboutContent(): void {
    this.loading = true;
    this.aboutContentService.getAll().subscribe({
      next: (content) => {
        this.aboutContent = content.length > 0 ? content[0] : null;
        this.loading = false;
      },
      error: (error) => {
        console.error('Hakkında içeriği yüklenirken hata:', error);
        this.loading = false;
      },
    });
  }
}
