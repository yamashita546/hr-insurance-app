import { Component, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';



@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnDestroy {
  currentUser: any = null;
  private userSub: Subscription;

  constructor(private router: Router, private userCompanyService: UserCompanyService) {
    this.userSub = this.userCompanyService.user$.subscribe(user => {
      this.currentUser = user;
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  ngOnDestroy() {
    this.userSub.unsubscribe();
  }
}
