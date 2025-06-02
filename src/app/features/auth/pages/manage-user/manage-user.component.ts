import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-manage-user',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-user.component.html',
  styleUrl: './manage-user.component.css'
})
export class ManageUserComponent implements OnInit {
  companyId: string = '';
  companyName: string = '';
  userName: string = '';
  email: string = '';
  role: string = '';

  constructor(private userCompanyService: UserCompanyService) {}

  ngOnInit(): void {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyId), take(1))
      .subscribe(company => {
        this.companyId = company!.companyId;
        this.companyName = company!.name;
      });
    this.userCompanyService.user$
      .pipe(filter(user => !!user && !!user.uid), take(1))
      .subscribe(user => {
        this.userName = user!.displayName || '';
        this.email = user!.email || '';
        this.role = user!.role || '';
      });
  }
}
