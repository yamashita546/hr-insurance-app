import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { filter, take } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { ChartConfiguration, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BaseChartDirective],
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
  offices: any[] = [];
  selectedOfficeId: string = '';
  selectedType: 'salary' | 'bonus' = 'salary';
  filteredOffices: any[] = [];
  officeInsuranceInfo: {
    officeId: string;
    officeName: string;
    salaryTotal: number;
    insuranceTotal: number;
    employeeDeduction: number;
    companyShare: number;
    childcareDeduction: number;
    companyShareTotal: number;
  }[] = [];
  officeCompanyShareTotal: number = 0;
  detailModalVisible: boolean = false;
  detailModalData: any = null;
  insuranceSalaryCalculations: any[] = [];
  insuranceBonusCalculations: any[] = [];

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

  // NaNやカンマ付き文字列を安全に数値化する関数
  private safeNumber(val: any): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const n = Number(val.replace(/,/g, ''));
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }

  // 端数処理（0.50円以下切り捨て、0.51円以上切り上げ、0.50は切り捨て）
  private roundInsurance(val: number): number {
    const intPart = Math.floor(val);
    const decimal = val - intPart;
    if (decimal < 0.5) return intPart;
    if (decimal > 0.5) return intPart + 1;
    // ちょうど0.5の場合は切り捨て
    return intPart;
  }

  async updateCurrentMonthStatus() {
    console.log('[updateCurrentMonthStatus] called');
    console.log('  selectedOfficeId:', this.selectedOfficeId);
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    

    // filteredOfficesを更新
    this.filteredOffices = this.selectedOfficeId
      ? this.offices.filter(o => o.id === this.selectedOfficeId && o.isActive !== false)
      : this.offices.filter(o => o.isActive !== false);
    console.log('  filteredOffices:', this.filteredOffices.map(o => ({id: o.id, name: o.name})));

    // Firestoreから給与・賞与データ取得
    const insuranceSalaryList = (await this.firestoreService.getInsuranceSalaryCalculations()).filter((c: any) => c.companyKey === this.companyKey && c.applyYearMonth === ym);
    const insuranceBonusList = (await this.firestoreService.getInsuranceBonusCalculations()).filter((c: any) => c.companyKey === this.companyKey && c.applyYearMonth === ym);

    // 北海道支社のofficeIdを取得
    const hokkaidoOffice = this.offices.find(o => o.name === '北海道支社' || o.officeName === '北海道支社');
    if (hokkaidoOffice) {
      const hokkaidoSalary = insuranceSalaryList.filter(row => row.officeId === hokkaidoOffice.id);
      const hokkaidoBonus = insuranceBonusList.filter(row => row.officeId === hokkaidoOffice.id);
      console.log('【北海道支社】給与データ:', hokkaidoSalary);
      console.log('【北海道支社】賞与データ:', hokkaidoBonus);
    } else {
      console.log('北海道支社のofficeIdが見つかりません');
    }

    // 1. 事業所ごとに給与データを集計
    const salaryOfficeMap = new Map<string, any>();
    this.filteredOffices.forEach(office => {
      const salaryList = insuranceSalaryList.filter(row => row.officeId === office.id);
      const salaryTotal = salaryList.reduce((sum, row) => sum + this.safeNumber(row.salaryTotal), 0);
      const insuranceTotal = salaryList.reduce((sum, row) => sum + this.safeNumber(row.healthInsurance) + this.safeNumber(row.pension), 0);
      const employeeDeduction = salaryList.reduce((sum, row) => sum + this.safeNumber(row.healthInsuranceDeduction) + this.safeNumber(row.pensionDeduction), 0);
      const childcareDeduction = salaryList.reduce((sum, row) => sum + this.safeNumber(row.childcare), 0);
      salaryOfficeMap.set(office.id, {
        salaryTotal,
        insuranceTotal,
        employeeDeduction,
        childcareDeduction
      });
    });

    // 2. 事業所ごとに賞与データを集計
    const bonusOfficeMap = new Map<string, any>();
    this.filteredOffices.forEach(office => {
      const bonusList = insuranceBonusList.filter(row => row.officeId === office.id);
      const bonusTotal = bonusList.reduce((sum, row) => sum + this.safeNumber(row.bonusTotal), 0);
      const insuranceTotal = bonusList.reduce((sum, row) => sum + this.safeNumber(row.healthInsurance) + this.safeNumber(row.pension), 0);
      const employeeDeduction = bonusList.reduce((sum, row) => sum + this.safeNumber(row.healthInsuranceDeduction) + this.safeNumber(row.pensionDeduction), 0);
      const childcareDeduction = bonusList.reduce((sum, row) => sum + this.safeNumber(row.childcare), 0);
      bonusOfficeMap.set(office.id, {
        bonusTotal,
        insuranceTotal,
        employeeDeduction,
        childcareDeduction
      });
    });

    // 3. 給与・賞与の集計データを合計し、端数処理・会社合計を集計
    this.officeInsuranceInfo = this.filteredOffices.map(office => {
      const salary = salaryOfficeMap.get(office.id) || { salaryTotal: 0, insuranceTotal: 0, employeeDeduction: 0, childcareDeduction: 0 };
      const bonus = bonusOfficeMap.get(office.id) || { bonusTotal: 0, insuranceTotal: 0, employeeDeduction: 0, childcareDeduction: 0 };
      const salaryTotal = salary.salaryTotal + (bonus.bonusTotal || 0);
      const insuranceTotalRaw = salary.insuranceTotal + bonus.insuranceTotal;
      const employeeDeduction = salary.employeeDeduction + bonus.employeeDeduction;
      const childcareDeductionRaw = salary.childcareDeduction + bonus.childcareDeduction;
      // 端数処理
      const insuranceTotal = this.roundInsurance(insuranceTotalRaw);
      const childcareDeduction = this.roundInsurance(childcareDeductionRaw);
      const companyShare = insuranceTotal - employeeDeduction;
      const companyShareTotal = companyShare + childcareDeduction;
      return {
        officeId: office.id,
        officeName: office.name,
        salaryTotal,
        insuranceTotal,
        employeeDeduction,
        companyShare,
        childcareDeduction,
        companyShareTotal
      };
    });
    console.log('  officeInsuranceInfo:', this.officeInsuranceInfo.map(o => ({officeId: o.officeId, officeName: o.officeName})));
    // 会社負担額合計（子ども子育て拠出金含む）
    this.officeCompanyShareTotal = this.officeInsuranceInfo.reduce((sum, o) => sum + o.companyShareTotal, 0);

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
    console.log('[ngOnInit] called');
    this.userCompanyService.company$.subscribe(company => {
      if (company) {
        this.companyId = company.companyId || '';
        this.companyName = (company as any).displayName || company.name || '';
      }
    });
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyKey), take(1))
      .subscribe(async company => {
        console.log('[ngOnInit] company$ loaded, companyKey:', company!.companyKey);
        this.companyKey = company!.companyKey;
        // 支社・従業員数取得
        const [offices, employees] = await Promise.all([
          this.firestoreService.getOffices(this.companyKey),
          this.firestoreService.getEmployeesByCompanyKey(this.companyKey)
        ]);
        this.offices = offices;
        this.officeCount = offices.length;
        console.log('[ngOnInit] offices loaded:', offices.map(o => ({id: o.id, name: o.name, isActive: o.isActive})));

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

  async onYearMonthChange() {
    await this.updateCurrentMonthStatus();
  }

  async onOfficeChange() {
    console.log('[onOfficeChange] called, selectedOfficeId:', this.selectedOfficeId);
    // 追加: 選択直後の状態を出力
    console.log('  selectedOfficeName:', this.selectedOfficeName);
    console.log('  filteredOffices:', this.filteredOffices.map(o => ({id: o.id, name: o.name})));
    console.log('  displayedOfficeInsuranceInfo:', this.displayedOfficeInsuranceInfo.map(i => ({officeId: i.officeId, officeName: i.officeName})));
    await this.updateCurrentMonthStatus();
  }

  get activeOffices() {
    return this.offices.filter(o => o.isActive !== false);
  }

  get displayedOfficeInsuranceInfo() {
    if (!this.selectedOfficeId) {
      return this.officeInsuranceInfo;
    }
    return this.officeInsuranceInfo.filter(info => info.officeId === this.selectedOfficeId);
  }

  get selectedOfficeName() {
    if (!this.selectedOfficeId) return '全事業所';
    const office = this.activeOffices.find(o => o.id === this.selectedOfficeId);
    return office?.officeName || office?.name || '';
  }

  async openInsuranceDetailModal(officeId: string) {
    // officeIdが空文字なら全事業所
    const targetOffices = officeId
      ? this.offices.filter(o => o.id === officeId)
      : this.offices.filter(o => o.isActive !== false);

    // 対象年月
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;

    // Firestoreから最新データ取得
    const insuranceSalaryList = (await this.firestoreService.getInsuranceSalaryCalculations())
      .filter((c: any) => c.companyKey === this.companyKey && c.applyYearMonth === ym && targetOffices.some(o => o.id === c.officeId));
    const insuranceBonusList = (await this.firestoreService.getInsuranceBonusCalculations())
      .filter((c: any) => c.companyKey === this.companyKey && c.applyYearMonth === ym && targetOffices.some(o => o.id === c.officeId));

    // デバッグ用ログ
    console.log('[openInsuranceDetailModal] officeId:', officeId);
    console.log('  targetOffices:', targetOffices);
    console.log('  salaryList:', insuranceSalaryList);
    console.log('  bonusList:', insuranceBonusList);

    // 給与集計
    const salaryDetail = {
      count: insuranceSalaryList.length,
      salaryTotal: insuranceSalaryList.reduce((sum: any, row: any) => sum + Number(row.salaryTotal || 0), 0),
      insuranceTotal: insuranceSalaryList.reduce((sum: any, row: any) => sum + Number(row.healthInsurance || 0) + Number(row.pension || 0), 0),
      employeeDeduction: insuranceSalaryList.reduce((sum: any, row: any) => sum + Number(row.healthInsuranceDeduction || 0) + Number(row.pensionDeduction || 0), 0),
      // 会社負担 = 保険料合計 - 従業員控除額合計
      companyShare: 0, // 後で上書き
      childcare: insuranceSalaryList.reduce((sum: any, row: any) => sum + Number(row.childcare || 0), 0),
      companyShareTotal: 0, // 後で上書き
    };
    salaryDetail.companyShare = salaryDetail.insuranceTotal - salaryDetail.employeeDeduction;
    salaryDetail.companyShareTotal = salaryDetail.companyShare + salaryDetail.childcare;
    console.log('  salaryDetail:', salaryDetail);

    // 賞与集計
    const bonusDetail = {
      count: insuranceBonusList.length,
      bonusTotal: insuranceBonusList.reduce((sum: any, row: any) => sum + Number(row.bonusTotal || 0), 0),
      insuranceTotal: insuranceBonusList.reduce((sum: any, row: any) => sum + Number(row.healthInsurance || 0) + Number(row.pension || 0), 0),
      employeeDeduction: insuranceBonusList.reduce((sum: any, row: any) => sum + Number(row.healthInsuranceDeduction || 0) + Number(row.pensionDeduction || 0), 0),
      // 会社負担 = 保険料合計 - 従業員控除額合計
      companyShare: 0, // 後で上書き
      childcare: insuranceBonusList.reduce((sum: any, row: any) => sum + Number(row.childcare || 0), 0),
      companyShareTotal: 0, // 後で上書き
    };
    bonusDetail.companyShare = bonusDetail.insuranceTotal - bonusDetail.employeeDeduction;
    bonusDetail.companyShareTotal = bonusDetail.companyShare + bonusDetail.childcare;
    console.log('  bonusDetail:', bonusDetail);

    this.detailModalData = { salaryDetail, bonusDetail };
    this.detailModalVisible = true;
  }

  closeInsuranceDetailModal() {
    this.detailModalVisible = false;
    this.detailModalData = null;
  }

  exportInsuranceTableToCSV() {
    // 選択年月
    const ymLabel = `${this.selectedYear}年${this.selectedMonth}月`;
    // ヘッダー
    const headers = [
      '年月', '事業所名', '支給総額', '保険料合計', '従業員控除額', '会社負担', '子ども子育て拠出金', '会社負担合計'
    ];
    // データ行
    const rows = this.displayedOfficeInsuranceInfo.map((info: any) => [
      ymLabel,
      info.officeName,
      info.salaryTotal,
      info.insuranceTotal,
      info.employeeDeduction,
      info.companyShare,
      info.childcareDeduction,
      info.companyShareTotal
    ]);
    // CSV文字列生成
    const csvContent = [headers, ...rows]
      .map(row => row.map(val => `"${val}"`).join(','))
      .join('\r\n');
    // ダウンロード処理
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'insurance_table.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
