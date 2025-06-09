import { Component, OnInit } from '@angular/core';
import { FirestoreService } from '../../../../../core/services/firestore.service';
import { AppUser } from '../../../../../core/models/user.model';
import { Company } from '../../../../../core/models/company.model';
import { DateTimestampPipe } from '../../../../../core/pipe/date-timestamp.pipe';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-company-owner',
  standalone: true,
  imports: [DateTimestampPipe, CommonModule, RouterModule, FormsModule],
  templateUrl: './company-owner.component.html',
  styleUrl: './company-owner.component.css'
})
export class CompanyOwnerComponent implements OnInit {
  companies: Company[] = [];
  ownerUsers: { [companyKey: string]: AppUser[] } = {};

  filterCompanyId: string = '';
  filterCompanyName: string = '';
  sortKey: 'companyId' | 'companyName' | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private firestoreService: FirestoreService) {}

  async ngOnInit() {
    // 会社一覧を取得（Observable→Promiseで全件取得）
    this.companies = await new Promise<Company[]>(resolve => {
      this.firestoreService.getCompanies().subscribe(companies => resolve(companies));
    });
    // 各会社ごとにオーナーユーザー一覧を取得
    for (const company of this.companies) {
      this.ownerUsers[company.companyKey] = await this.firestoreService.getOwnerUsersByCompanyKey(company.companyKey);
    }
  }

  onSort(key: 'companyId' | 'companyName') {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
  }

  filteredAndSortedCompanies(): Company[] {
    let filtered = this.companies.filter(c =>
      (!this.filterCompanyId || c.companyId === this.filterCompanyId) &&
      (!this.filterCompanyName || c.name === this.filterCompanyName)
    );
    if (this.sortKey) {
      filtered = filtered.sort((a, b) => {
        const aValue = this.sortKey === 'companyId' ? a.companyId : a.name;
        const bValue = this.sortKey === 'companyId' ? b.companyId : b.name;
        if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }

  // Date, Timestamp, string いずれもDate型に変換する共通メソッド
  toDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (val.toDate) return val.toDate();
    if (typeof val === 'string' && !isNaN(Date.parse(val))) return new Date(val);
    return null;
  }

  
}
