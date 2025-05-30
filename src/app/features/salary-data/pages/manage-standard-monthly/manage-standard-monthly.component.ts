import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { filter } from 'rxjs/operators';
import { Router, RouterModule } from '@angular/router';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { StandardMonthlyDecision } from '../../../../core/models/standard-monthly-decision .model';
import { Office } from '../../../../core/models/company.model';
@Component({
  selector: 'app-manage-standard-monthly',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './manage-standard-monthly.component.html',
  styleUrl: './manage-standard-monthly.component.css'
})
export class ManageStandardMonthlyComponent implements OnInit {
  companyId: string = '';
  companyDisplayId: string = '';
  companyName: string = '';
  offices: Office[] = [];
  standardMonthlyList: StandardMonthlyDecision[] = [];
  employees: any[] = [];

  constructor(private userCompanyService: UserCompanyService, private firestoreService: FirestoreService) {}

  ngOnInit() {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyId))
      .subscribe(async company => {
        this.companyId = company!.companyId;
        this.companyDisplayId = company!.displayId;
        this.companyName = company!.name;
        // Firestoreから標準報酬月額決定データを取得
        const snap = await this.firestoreService.getStandardMonthlyDecisionsByCompanyId(this.companyId);
        this.standardMonthlyList = snap;
        // Firestoreから従業員リストも取得
        this.employees = await this.firestoreService.getEmployeesByCompanyId(this.companyId);
        // Firestoreから支社リストも取得
        this.offices = await this.firestoreService.getOffices(this.companyId);
      });
  }

  getEmployeeName(employeeId: string): string {
    const emp = this.employees.find(e => e.employeeId === employeeId);
    return emp ? `${emp.lastName} ${emp.firstName}` : employeeId;
  }

  getOfficeName(officeId: string): string {
    const office = this.offices.find(o => o.id === officeId);
    return office ? office.name : officeId;
  }

  onRevision(row: any) {
    alert(`「${row.name}」の随時改定ボタンがクリックされました。`);
  }

  getNextGrade(row: StandardMonthlyDecision): string {
    const next = this.standardMonthlyList
      .filter(r =>
        r.employeeId === row.employeeId &&
        r.officeId === row.officeId &&
        r.applyYearMonth > row.applyYearMonth
      )
      .sort((a, b) => a.applyYearMonth.localeCompare(b.applyYearMonth))[0];
    return next ? `${next.healthGrade}（${next.pensionGrade}）` : 'ー';
  }

  getNextDecision(row: StandardMonthlyDecision): StandardMonthlyDecision | null {
    const next = this.standardMonthlyList
      .filter(r =>
        r.employeeId === row.employeeId &&
        r.officeId === row.officeId &&
        r.applyYearMonth > row.applyYearMonth
      )
      .sort((a, b) => a.applyYearMonth.localeCompare(b.applyYearMonth))[0];
    return next || null;
  }
}
