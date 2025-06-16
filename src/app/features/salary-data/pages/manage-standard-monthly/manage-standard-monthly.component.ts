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
  companyKey: string = '';
  companyId: string = '';
  companyName: string = '';
  offices: Office[] = [];
  standardMonthlyList: StandardMonthlyDecision[] = [];
  employees: any[] = [];

  // ソート用
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private userCompanyService: UserCompanyService, private firestoreService: FirestoreService, private router: Router) {}

  ngOnInit() {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyKey))
      .subscribe(async company => {
        this.companyKey = company!.companyKey;
        this.companyId = company!.companyId;
        this.companyName = company!.name;
        // Firestoreから標準報酬月額決定データを取得
        const snap = await this.firestoreService.getStandardMonthlyDecisionsByCompanyKey(this.companyKey);
        this.standardMonthlyList = snap;
        console.log('Firestoreから取得したstandardMonthlyList:', this.standardMonthlyList);
        // Firestoreから従業員リストも取得
        this.employees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey);
        console.log('Firestoreから取得したemployees:', this.employees);
        // Firestoreから支社リストも取得
        this.offices = await this.firestoreService.getOffices(this.companyKey);
        console.log('Firestoreから取得したoffices:', this.offices);
        // テーブル表示用リストの確認
        const currentList = this.getCurrentStandardMonthlyList();
        console.log('getCurrentStandardMonthlyList()の返り値:', currentList);
      });
  }

  getEmployeeName(employeeId: string): string {
    const emp = this.employees.find(e => e.employeeId === employeeId);
    return emp ? `${emp.lastName} ${emp.firstName}` : employeeId;
  }

  getLatestOfficeId(employeeId: string): string | undefined {
    const emp = this.employees.find(e => e.employeeId === employeeId);
    return emp?.officeId;
  }

  getOfficeName(officeId: string): string {
    const office = this.offices.find(o => o.id === officeId);
    return office ? office.name : officeId;
  }

  onRevision(row: any) {
    this.router.navigate(['/detail-standard-monthly', row.employeeId, row.officeId]);
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
    const today = new Date();
    const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const next = this.standardMonthlyList
      .filter(r =>
        r.employeeId === row.employeeId &&
        r.officeId === row.officeId &&
        r.applyYearMonth > currentYm &&
        r.isActive !== false
      )
      .sort((a, b) => a.applyYearMonth.localeCompare(b.applyYearMonth))[0];
    return next || null;
  }

  getCurrentDecision(row: StandardMonthlyDecision): StandardMonthlyDecision | null {
    const today = new Date();
    const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const candidates = this.standardMonthlyList
      .filter(r =>
        r.employeeId === row.employeeId &&
        r.officeId === row.officeId &&
        r.applyYearMonth <= currentYm &&
        r.isActive !== false
      )
      .sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth));
    return candidates[0] || null;
  }

  // ソート切り替え
  onSort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  getCurrentStandardMonthlyList(): StandardMonthlyDecision[] {
    const today = new Date();
    const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const map = new Map<string, StandardMonthlyDecision>();
    this.standardMonthlyList
      .filter(decision => decision.isActive !== false) // 無効データ除外
      .forEach(decision => {
        // 対象従業員が存在しない、またはisActiveがfalseならスキップ
        const emp = this.employees.find(e => e.employeeId === decision.employeeId);
        if (!emp || emp.isActive === false) return;
        if (decision.applyYearMonth > currentYm) return; // 未来は除外
        // 最新officeIdでキーを作成
        const latestOfficeId = this.getLatestOfficeId(decision.employeeId);
        const key = `${decision.employeeId}_${latestOfficeId}`;
        if (!map.has(key) || map.get(key)!.applyYearMonth < decision.applyYearMonth) {
          map.set(key, decision);
        }
      });
    let arr = Array.from(map.values());
    // ソート処理
    if (this.sortColumn) {
      arr = arr.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        switch (this.sortColumn) {
          case 'office':
            aValue = this.getOfficeName(this.getLatestOfficeId(a.employeeId) || '');
            bValue = this.getOfficeName(this.getLatestOfficeId(b.employeeId) || '');
            break;
          case 'employeeId':
            aValue = a.employeeId;
            bValue = b.employeeId;
            break;
          case 'employeeName':
            aValue = this.getEmployeeName(a.employeeId);
            bValue = this.getEmployeeName(b.employeeId);
            break;
          case 'currentGrade':
            aValue = this.getCurrentDecision(a)?.healthGrade || '';
            bValue = this.getCurrentDecision(b)?.healthGrade || '';
            break;
          case 'currentMonthly':
            aValue = this.getCurrentDecision(a)?.healthMonthly || 0;
            bValue = this.getCurrentDecision(b)?.healthMonthly || 0;
            break;
          case 'applyYearMonth':
            aValue = a.applyYearMonth;
            bValue = b.applyYearMonth;
            break;
          case 'nextGrade':
            aValue = this.getNextDecision(a)?.healthGrade || '';
            bValue = this.getNextDecision(b)?.healthGrade || '';
            break;
          case 'nextMonthly':
            aValue = this.getNextDecision(a)?.healthMonthly || 0;
            bValue = this.getNextDecision(b)?.healthMonthly || 0;
            break;
          case 'nextApplyYearMonth':
            aValue = this.getNextDecision(a)?.applyYearMonth || '';
            bValue = this.getNextDecision(b)?.applyYearMonth || '';
            break;
          default:
            aValue = (a as any)[this.sortColumn];
            bValue = (b as any)[this.sortColumn];
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        } else {
          return this.sortDirection === 'asc'
            ? String(aValue).localeCompare(String(bValue), 'ja')
            : String(bValue).localeCompare(String(aValue), 'ja');
        }
      });
    }
    return arr;
  }
}
