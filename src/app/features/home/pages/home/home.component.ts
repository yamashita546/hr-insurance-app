import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  currentUser: any;

  constructor(private router: Router, private authService: AuthService) {
    this.currentUser = this.authService.currentUser;
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
