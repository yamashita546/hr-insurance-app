import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { StandardMonthlyDecision, STANDARD_MONTHLY_DECISION_TYPE_LABELS } from '../../../../core/models/standard-monthly-decision .model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-detail-standard-monthly',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detail-standard-monthly.component.html',
  styleUrl: './detail-standard-monthly.component.css'
})
export class DetailStandardMonthlyComponent implements OnInit {
  employeeId = '';
  officeId = '';
  companyKey = '';
  employee: any;
  office: any;
  decisions: StandardMonthlyDecision[] = [];
  currentDecision: StandardMonthlyDecision | null = null;
  decisionTypeLabels = STANDARD_MONTHLY_DECISION_TYPE_LABELS;
  employeeInfo: any = null;
  officeInfo: any = null;
  nextDecision: StandardMonthlyDecision | null = null;
  historyList: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.employeeId = this.route.snapshot.queryParamMap.get('employeeId') || '';
    this.officeId = this.route.snapshot.queryParamMap.get('officeId') || '';
    this.userCompanyService.company$.subscribe(async company => {
      if (!company) return;
      this.companyKey = company.companyKey;
      // Firestoreからデータ取得
      const allDecisions = await this.firestoreService.getStandardMonthlyDecisionsByCompanyKey(this.companyKey);
      this.decisions = allDecisions
        .filter(d => d.employeeId === this.employeeId && d.officeId === this.officeId)
        .map(d => ({ ...d, companyKey: this.companyKey }))
        .sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth));
      // 履歴も取得
      this.historyList = await this.firestoreService.getStandardMonthlyDecisionHistory(this.companyKey, this.employeeId, this.officeId);
      // 適用年月で現在・今後を正しく判定
      const today = new Date();
      const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      // 現在適用中
      this.currentDecision = this.decisions
        .filter(d => d.applyYearMonth <= currentYm && d.isActive !== false)
        .sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth))[0] || null;
      // 今後適用予定
      this.nextDecision = this.decisions
        .filter(d => d.applyYearMonth > currentYm && d.isActive !== false)
        .sort((a, b) => a.applyYearMonth.localeCompare(b.applyYearMonth))[0] || null;
      // Firestoreから従業員・事業所情報も取得
      const employees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey);
      this.employeeInfo = employees.find(e => e.employeeId === this.employeeId) || null;
      const offices = await this.firestoreService.getOffices(this.companyKey);
      this.officeInfo = offices.find(o => o.id === this.officeId) || null;
    });
  }

  getLabel(type: string): string {
    return this.decisionTypeLabels[type as keyof typeof this.decisionTypeLabels] || type;
  }

  onEditDecision(decision: any) {
    console.log('編集対象decision:', decision);
    const decisionId = `${decision.companyKey}_${decision.officeId}_${decision.employeeId}_${decision.applyYearMonth}`;
    this.router.navigate(['/standard-monthly-form'], { queryParams: { mode: 'edit', decisionId } });
  }
}
