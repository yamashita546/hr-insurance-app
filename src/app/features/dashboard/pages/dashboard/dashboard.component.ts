import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { filter, take } from 'rxjs/operators';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  employeeDeductionTotal: number = 0;
  companyShareTotal: number = 0;
  insuranceTotal: number = 0;
  roundingErrorTotal: number = 0;
  employeeCount: number = 30;
  officeCount: number = 0;
  salaryTotal: number = 0;
  companyKey: string = '';
  companyId: string = '';
  companyName: string = '';
  alerts: string[] = [
    '3名の従業員が標準報酬月額未登録です',
    '今月の給与データが未入力の従業員が2名います'
  ];
  activities: string[] = [
    '2024/05/21 山田太郎さんの給与データを登録',
    '2024/05/20 佐藤花子さんの標準報酬月額を更新'
  ];
  years: number[] = [2023, 2024, 2025];
  months: number[] = [1,2,3,4,5,6,7,8,9,10,11,12];
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1;
  familyCount: number = 12;
  insuredEmployeeCount: number = 28;
  salaryInsuranceTotal: number = 0;
  salaryEmployeeDeduction: number = 0;
  salaryCompanyShare: number = 0;
  bonusTotal: number = 0;
  bonusInsuranceTotal: number = 0;
  bonusEmployeeDeduction: number = 0;
  bonusCompanyShare: number = 0;
  insuranceRegistered: boolean = false;
  salaryRegistered: boolean = false;
  bonusRegistered: boolean = false;
  attendanceRegistered: boolean = false;
  standardMonthlyRegistered: boolean = false;
  unregisteredEmployeeCount: number = 0;
  newEmployeeCount: number = 2;
  retiredEmployeeCount: number = 1;
  fullTimeCount: number = 18;
  partTimeCount: number = 8;
  contractCount: number = 4;
  maleCount: number = 16;
  femaleCount: number = 14;
  uninsuredEmployeeCount: number = 2;
  // 当月データ登録状況用
  insuranceRegisteredCount = 0;
  insuranceRequiredCount = 0;
  salaryRegisteredCount = 0;
  salaryRequiredCount = 0;
  bonusRegisteredCount = 0;
  bonusRequiredCount = 0;
  attendanceRegisteredCount = 0;
  attendanceRequiredCount = 0;
  standardMonthlyRegisteredCount = 0;
  standardMonthlyRequiredCount = 0;

  constructor(
    private userCompanyService: UserCompanyService,
    private firestoreService: FirestoreService
  ) {}

  // 日付値取得ユーティリティ
  private getDateValue(val: any): Date | null {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    return null;
  }

  async updateCurrentMonthStatus() {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    // 社会保険料計算結果
    const insuranceSalaryList = (await this.firestoreService.getInsuranceSalaryCalculations()).filter((c: any) => c.companyKey === this.companyKey && c.applyYearMonth === ym);
    const insuranceBonusList = (await this.firestoreService.getInsuranceBonusCalculations()).filter((c: any) => c.companyKey === this.companyKey && c.applyYearMonth === ym);

    // === 重複チェック付き登録数集計 ===
    // 社会保険料（給与）
    const insuranceMap = new Map();
    insuranceSalaryList.forEach(c => {
      const prev = insuranceMap.get(c.employeeId);
      const prevDate = prev ? this.getDateValue(prev.updatedAt) : null;
      const currDate = this.getDateValue(c.updatedAt);
      if (!prev || (currDate && prevDate && currDate > prevDate)) {
        insuranceMap.set(c.employeeId, c);
      }
    });
    this.insuranceRegisteredCount = insuranceMap.size;
    this.insuranceRequiredCount = this.insuredEmployeeCount;
    this.insuranceRegistered = this.insuranceRegisteredCount === this.insuranceRequiredCount && this.insuranceRequiredCount > 0;

    // 給与
    const salaryListChecked = (await this.firestoreService.getSalariesByCompanyKey(this.companyKey)).filter((s: any) => s.targetYearMonth === ym);
    const salaryMap = new Map();
    salaryListChecked.forEach(s => {
      const prev = salaryMap.get(s.employeeId);
      const prevDate = prev ? this.getDateValue(prev.updatedAt) : null;
      const currDate = this.getDateValue(s.updatedAt);
      if (!prev || (currDate && prevDate && currDate > prevDate)) {
        salaryMap.set(s.employeeId, s);
      }
    });
    this.salaryRegisteredCount = salaryMap.size;
    this.salaryRequiredCount = this.employeeCount;
    this.salaryRegistered = this.salaryRegisteredCount === this.salaryRequiredCount && this.salaryRequiredCount > 0;

    // 賞与
    const bonusListChecked = (await this.firestoreService.getBonusesByCompanyKey(this.companyKey)).filter((b: any) => b.targetYearMonth === ym);
    const bonusMap = new Map();
    bonusListChecked.forEach(b => {
      const prev = bonusMap.get(b.employeeId);
      const prevDate = prev ? this.getDateValue(prev.updatedAt) : null;
      const currDate = this.getDateValue(b.updatedAt);
      if (!prev || (currDate && prevDate && currDate > prevDate)) {
        bonusMap.set(b.employeeId, b);
      }
    });
    this.bonusRegisteredCount = bonusMap.size;
    this.bonusRequiredCount = this.employeeCount;
    this.bonusRegistered = this.bonusRegisteredCount === this.bonusRequiredCount && this.bonusRequiredCount > 0;

    // 勤怠
    const attendanceList = (await this.firestoreService.getAttendancesByCompanyKey(this.companyKey)).filter((a: any) => a.targetYearMonth === ym);
    const attendanceMap = new Map();
    attendanceList.forEach(a => {
      const prev = attendanceMap.get(a.employeeId);
      const prevDate = prev ? this.getDateValue(prev.updatedAt) : null;
      const currDate = this.getDateValue(a.updatedAt);
      if (!prev || (currDate && prevDate && currDate > prevDate)) {
        attendanceMap.set(a.employeeId, a);
      }
    });
    this.attendanceRegisteredCount = attendanceMap.size;
    this.attendanceRequiredCount = this.employeeCount;
    this.attendanceRegistered = this.attendanceRegisteredCount === this.attendanceRequiredCount && this.attendanceRequiredCount > 0;

    // 保険料情報（給与）
    this.salaryTotal = insuranceSalaryList.reduce((sum, row) => sum + (Number(row.salaryTotal) || 0), 0);
    this.salaryInsuranceTotal = insuranceSalaryList.reduce((sum, row) => sum + (Number(row.healthInsurance) || 0) + (Number(row.pension) || 0), 0);
    this.salaryEmployeeDeduction = insuranceSalaryList.reduce((sum, row) => sum + (Number(row.healthInsuranceDeduction) || 0) + (Number(row.pensionDeduction) || 0), 0);
    this.salaryCompanyShare = insuranceSalaryList.reduce((sum, row) => sum + (Number(row.companyShare) || 0), 0);

    // 保険料情報（賞与）
    this.bonusTotal = insuranceBonusList.reduce((sum, row) => sum + (Number(row.bonusTotal) || 0), 0);
    this.bonusInsuranceTotal = insuranceBonusList.reduce((sum, row) => sum + (Number(row.healthInsurance) || 0) + (Number(row.pension) || 0), 0);
    this.bonusEmployeeDeduction = insuranceBonusList.reduce((sum, row) => sum + (Number(row.healthInsuranceDeduction) || 0) + (Number(row.pensionDeduction) || 0), 0);
    this.bonusCompanyShare = insuranceBonusList.reduce((sum, row) => sum + (Number(row.companyShare) || 0), 0);

    // 標準報酬月額（前回の重複チェック付きロジックを維持）
    const smdList = (await this.firestoreService.getStandardMonthlyDecisionsByCompanyKey(this.companyKey))
      .filter((d: any) => d.isActive !== false && d.employeeId);
    const smdMap = new Map();
    const ymNum = Number(ym.replace('-', ''));
    const activeEmployees = (await this.firestoreService.getEmployeesByCompanyKey(this.companyKey)).filter((e: any) => e.isActive !== false);
    activeEmployees.forEach(e => {
      // applyYearMonth <= ym かつ isActive
      const latest = smdList
        .filter(d => d.employeeId === e.employeeId && Number((d.applyYearMonth || '').replace('-', '')) <= ymNum)
        .sort((a, b) => Number((b.applyYearMonth || '').replace('-', '')) - Number((a.applyYearMonth || '').replace('-', '')))[0];
      if (latest) smdMap.set(e.employeeId, latest);
    });
    this.standardMonthlyRegisteredCount = smdMap.size;
    this.standardMonthlyRequiredCount = this.insuredEmployeeCount;
    this.standardMonthlyRegistered = this.standardMonthlyRegisteredCount === this.standardMonthlyRequiredCount && this.standardMonthlyRequiredCount > 0;

    // 既存の集計
    const [salaryList, bonusList] = await Promise.all([
      (await this.firestoreService.getInsuranceSalaryCalculations()).filter((c: any) => c.companyKey === this.companyKey && c.applyYearMonth === ym),
      (await this.firestoreService.getInsuranceBonusCalculations()).filter((c: any) => c.companyKey === this.companyKey && c.applyYearMonth === ym)
    ]);
    const allList = [...salaryList, ...bonusList];
    this.employeeDeductionTotal = allList.reduce((sum, row) => sum + (Number(row.healthInsuranceDeduction) || 0) + (Number(row.pensionDeduction) || 0), 0);
    this.companyShareTotal = allList.reduce((sum, row) => sum + (Number(row.companyShare) || 0), 0);
    this.insuranceTotal = this.employeeDeductionTotal + this.companyShareTotal;
    // 端数誤差例（理論値との差分を合計）
    this.roundingErrorTotal = allList.reduce((sum, row) => {
      // 端数処理前の理論値（例: healthInsurance/2 + pension/2）
      const theoretical = ((Number(row.healthInsurance) || 0) / 2) + ((Number(row.pension) || 0) / 2);
      const actual = (Number(row.healthInsuranceDeduction) || 0) + (Number(row.pensionDeduction) || 0);
      return sum + (actual - Math.round(theoretical));
    }, 0);
  }

  async ngOnInit() {
    this.userCompanyService.company$.subscribe(company => {
      if (company) {
        this.companyId = company.companyId || '';
        this.companyName = (company as any).displayName || company.name || '';
      }
    });
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyKey), take(1))
      .subscribe(async company => {
        this.companyKey = company!.companyKey;
        // 支社・従業員数取得
        const [offices, employees] = await Promise.all([
          this.firestoreService.getOffices(this.companyKey),
          this.firestoreService.getEmployeesByCompanyKey(this.companyKey)
        ]);
        this.officeCount = offices.length;

        // === 集計処理 ===
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        // 今月の1日と末日
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // 在籍従業員数
        const activeEmployees = employees.filter(e => e.isActive !== false);
        this.employeeCount = activeEmployees.length;

        // 今月入社
        this.newEmployeeCount = activeEmployees.filter(e => {
          if (!e.contractStartDate) return false;
          const d = new Date(e.contractStartDate);
          return d >= monthStart && d <= monthEnd;
        }).length;
        // 今月退職
        this.retiredEmployeeCount = employees.filter(e => {
          if (!e.contractEndDate) return false;
          const d = new Date(e.contractEndDate);
          return d >= monthStart && d <= monthEnd;
        }).length;

        // 雇用形態別
        this.fullTimeCount = activeEmployees.filter(e => e.employeeType === 'regular').length;
        this.partTimeCount = activeEmployees.filter(e => e.employeeType === 'parttime' || e.employeeType === 'parttimejob').length;
        this.contractCount = activeEmployees.filter(e => e.employeeType === 'contract').length;

        // 男女別
        this.maleCount = activeEmployees.filter(e => e.gender === 'male' || e.gender === '男性').length;
        this.femaleCount = activeEmployees.filter(e => e.gender === 'female' || e.gender === '女性').length;

        // 社会保険加入/未加入
        this.insuredEmployeeCount = activeEmployees.filter(e => e.healthInsuranceStatus?.isApplicable).length;
        this.uninsuredEmployeeCount = activeEmployees.filter(e => !e.healthInsuranceStatus?.isApplicable).length;

        // 被扶養家族数（dependents配列が存在し1件以上なら1件とカウント）
        this.familyCount = activeEmployees.reduce((sum, e) => sum + (Array.isArray(e.dependents) && e.dependents.length > 0 ? 1 : 0), 0);

        // 当月データ登録状況を取得
        await this.updateCurrentMonthStatus();
      });
  }

  onYearMonthChange() {
    this.updateCurrentMonthStatus();
  }
}
