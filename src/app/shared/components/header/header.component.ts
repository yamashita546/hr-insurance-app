import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  imports: [CommonModule, RouterModule],
})
export class HeaderComponent {
  menuOpen = false;
  authService = inject(AuthService);
  router = inject(Router);

  get userName(): string {
    const user = this.authService.currentUser;
    return user?.displayName || user?.email || 'アカウント';
  }

  get userInitial(): string {
    const user = this.authService.currentUser;
    return user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'ア';
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  goToAccountSettings(event: MouseEvent) {
    event.stopPropagation();
    this.menuOpen = false;
    this.router.navigate(['/manage-user']);
  }

  async logout(event: MouseEvent) {
    event.stopPropagation();
    this.menuOpen = false;
    const confirmed = window.confirm('ログアウトしてよろしいですか？');
    if (!confirmed) return;
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
