import { Component, OnInit } from '@angular/core';
import { AppUser } from '../../../../core/models/user.model';
import { Company } from '../../../../core/models/company.model';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { DateTimestampPipe } from '../../../../core/pipe/date-timestamp.pipe';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Router , RouterModule,} from '@angular/router';

@Component({
  selector: 'app-manage-operator',
  standalone: true,
  imports: [CommonModule, DateTimestampPipe, RouterModule],
  templateUrl: './manage-operator.component.html',
  styleUrl: './manage-operator.component.css'
})
export class ManageOperatorComponent implements OnInit {
  companyId: string = '';
  companyName: string = '';
  operatorUsers: AppUser[] = [];
  ownerUsers: AppUser[] = [];
  allUsers: AppUser[] = [];

  constructor(private firestoreService: FirestoreService, private userCompanyService: UserCompanyService) {}

  async ngOnInit() {
    // ログインユーザーの会社情報を取得
    this.userCompanyService.company$.subscribe(company => {
      if (company) {
        this.companyId = company.companyId;
        this.companyName = company.name;
        this.loadOperatorUsers(company.companyKey);
      }
    });
  }

  async loadOperatorUsers(companyKey: string) {
    this.operatorUsers = await this.firestoreService.getOperatorUsersByCompanyKey(companyKey);
    this.ownerUsers = await this.firestoreService.getOwnerUsersByCompanyKey(companyKey);
    this.allUsers = [...this.operatorUsers, ...this.ownerUsers];
  }
}
