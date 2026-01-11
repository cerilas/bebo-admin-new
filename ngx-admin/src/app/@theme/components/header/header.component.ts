import { Component, OnDestroy, OnInit } from '@angular/core';
import { NbMediaBreakpointsService, NbMenuService, NbSidebarService, NbThemeService } from '@nebular/theme';

import { UserData } from '../../../@core/data/users';
import { LayoutService } from '../../../@core/utils';
import { AuthService } from '../../../@core/services/auth.service';
import { map, takeUntil, filter } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'ngx-header',
  styleUrls: ['./header.component.scss'],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {

  private destroy$: Subject<void> = new Subject<void>();
  userPictureOnly: boolean = false;
  user: any;
  currentUser: any;

  themes = [
    {
      value: 'default',
      name: 'Açık',
    },
    {
      value: 'dark',
      name: 'Koyu',
    },
    {
      value: 'cosmic',
      name: 'Kozmik',
    },
    {
      value: 'corporate',
      name: 'Kurumsal',
    },
  ];

  currentTheme = 'default';

  userMenu = [ { title: 'Çıkış Yap' } ];

  constructor(private sidebarService: NbSidebarService,
              private menuService: NbMenuService,
              private themeService: NbThemeService,
              private userService: UserData,
              private layoutService: LayoutService,
              private breakpointService: NbMediaBreakpointsService,
              private authService: AuthService) {
  }

  ngOnInit() {
    this.currentTheme = this.themeService.currentTheme;
    
    // Current admin user
    this.currentUser = this.authService.getCurrentUser();
    this.user = this.currentUser?.displayName || 'Admin';

    const { xl } = this.breakpointService.getBreakpointsMap();
    this.themeService.onMediaQueryChange()
      .pipe(
        map(([, currentBreakpoint]) => currentBreakpoint.width < xl),
        takeUntil(this.destroy$),
      )
      .subscribe((isLessThanXl: boolean) => this.userPictureOnly = isLessThanXl);

    this.themeService.onThemeChange()
      .pipe(
        map(({ name }) => name),
        takeUntil(this.destroy$),
      )
      .subscribe(themeName => this.currentTheme = themeName);
    
    // User menu click handler
    this.menuService.onItemClick()
      .pipe(
        filter(({ tag }) => tag === 'user-menu'),
        takeUntil(this.destroy$),
      )
      .subscribe(({ item }) => {
        if (item.title === 'Çıkış Yap') {
          this.authService.logout();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  changeTheme(themeName: string) {
    this.themeService.changeTheme(themeName);
  }

  toggleSidebar(): boolean {
    this.sidebarService.toggle(true, 'menu-sidebar');
    this.layoutService.changeLayoutSize();

    return false;
  }

  navigateHome() {
    this.menuService.navigateHome();
    return false;
  }
}
