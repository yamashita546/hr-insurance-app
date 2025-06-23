import { Component, OnDestroy, OnInit } from '@angular/core';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';
import { IdleTimeoutService } from '../../core/services/idle-timeout.service';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private timeoutSubscription: Subscription | undefined;

  constructor(
    private idleTimeoutService: IdleTimeoutService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.timeoutSubscription = this.idleTimeoutService.startWatching().subscribe(() => {
      this.authService.logout('一定時間操作がなかったため、自動的にログアウトしました。');
    });
  }

  ngOnDestroy() {
    this.idleTimeoutService.stopWatching();
    if (this.timeoutSubscription) {
      this.timeoutSubscription.unsubscribe();
    }
  }
}
