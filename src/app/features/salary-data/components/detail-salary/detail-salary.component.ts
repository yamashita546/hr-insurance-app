import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalaryFieldNameMap, BonusFieldNameMap, PromotionTypeMap } from '../../../../core/models/salary.model';
import { Location } from '@angular/common';
import { isEmployeeSelectable } from '../../../../core/services/empoloyee.active';

@Component({
  selector: 'app-detail-salary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detail-salary.component.html',
  styleUrl: './detail-salary.component.css'
})
export class DetailSalaryComponent implements OnInit {
  employeeId: string = '';
  targetYear: string = '';
  targetMonth: string = '';
  selectedYear: number = 0;
  selectedMonth: number = 0;
  years: number[] = [];
  months: number[] = [];
  employee: any = null;
  salary: any = null;
  bonuses: any[] = [];
  activeTab: 'salary' | 'bonus' = 'salary';
  companyKey: string = '';
  editMode: 'salary' | 'bonus' | null = null;
  editSalaryForm: any = {
    otherAllowances: [],
    inKindAllowances: [],
    retroAllowances: [],
    actualExpenses: [],
    totalOtherAllowance: 0,
    totalInKind: 0,
    totalRetro: 0,
    totalActualExpense: 0
  };
  editBonusForms: any[] = [{}];
  historyList: any[] = [];
  currentUser: any = null;

  // 追加: 事業所・従業員セレクト用
  offices: any[] = [];
  selectedOfficeId: string = '';
  allEmployees: any[] = [];
  filteredEmployees: any[] = [];
  selectedEmployeeId: string = '';

  // --- 賞与個別編集用 ---
  editBonusIndex: number | null = null;
  isAddingBonus: boolean = false;
  editBonusForm: any = {};

  promotionTypeMap = PromotionTypeMap;
  promotionTypeKeys = Object.keys(this.promotionTypeMap);

  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService,
    private location: Location,
    private router: Router
  ) {
    // ユーザー情報を購読して保持
    this.userCompanyService.user$.subscribe(user => {
      this.currentUser = user;
    });
  }

  async ngOnInit() {
    this.employeeId = this.route.snapshot.queryParamMap.get('employeeId') || '';
    this.targetYear = this.route.snapshot.queryParamMap.get('year') || '';
    this.targetMonth = this.route.snapshot.queryParamMap.get('month') || '';
    this.selectedYear = Number(this.targetYear) || new Date().getFullYear();
    this.selectedMonth = Number(this.targetMonth) || (new Date().getMonth() + 1);
    this.selectedEmployeeId = this.route.snapshot.queryParamMap.get('selectedEmployeeId') || this.employeeId;
    this.selectedOfficeId = this.route.snapshot.queryParamMap.get('selectedOfficeId') || '';
    const now = new Date();
    for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) {
      this.years.push(y);
    }
    for (let m = 1; m <= 12; m++) {
      this.months.push(m);
    }
    // companyKeyをUserCompanyServiceから取得
    this.userCompanyService.company$.subscribe(async company => {
      if (!company || !company.companyKey) return;
      this.companyKey = company.companyKey;
      // 事業所一覧取得
      this.offices = await this.firestoreService.getOffices(this.companyKey) || [];
      // 従業員一覧取得
      this.allEmployees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey) || [];
      // 初期選択値
      if (!this.selectedOfficeId) {
        // employeeIdから事業所を特定
        if (this.employeeId) {
          const emp = this.allEmployees.find(e => e.employeeId === this.employeeId);
          if (emp) {
            this.selectedOfficeId = emp.officeId;
            this.selectedEmployeeId = emp.employeeId;
          }
        }
        if (!this.selectedOfficeId && this.offices.length > 0) {
          this.selectedOfficeId = this.offices[0].officeId;
        }
      }
      this.updateFilteredEmployees();
      if (!this.selectedEmployeeId && this.filteredEmployees.length > 0) {
        this.selectedEmployeeId = this.filteredEmployees[0].employeeId;
      }
      await this.onEmployeeChange();
    });
    // 履歴も初期取得
    await this.loadHistory();
  }

  updateFilteredEmployees() {
    if (this.selectedOfficeId === 'ALL') {
      this.filteredEmployees = this.allEmployees.filter(e =>
        isEmployeeSelectable(e, this.selectedYear?.toString(), this.selectedMonth?.toString())
      );
    } else {
      this.filteredEmployees = this.allEmployees.filter(e =>
        e.officeId === this.selectedOfficeId &&
        isEmployeeSelectable(e, this.selectedYear?.toString(), this.selectedMonth?.toString())
      );
    }
    // ソート（従業員番号順）
    this.filteredEmployees.sort((a, b) => (a.employeeId > b.employeeId ? 1 : -1));
  }

  async onOfficeChange() {
    this.updateFilteredEmployees();
    if (this.filteredEmployees.length > 0) {
      this.selectedEmployeeId = this.filteredEmployees[0].employeeId;
      await this.onEmployeeChange();
    }
    // クエリパラメータ更新
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...this.route.snapshot.queryParams,
        selectedOfficeId: this.selectedOfficeId,
        selectedEmployeeId: this.selectedEmployeeId
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  async onEmployeeChange() {
    this.employeeId = this.selectedEmployeeId;
    this.employee = this.filteredEmployees.find(e => e.employeeId === this.employeeId) || null;
    await this.loadSalaryAndBonus();
    await this.loadHistory();
    // クエリパラメータ更新
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...this.route.snapshot.queryParams,
        selectedOfficeId: this.selectedOfficeId,
        selectedEmployeeId: this.selectedEmployeeId
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onNextEmployee() {
    if (!this.filteredEmployees.length) return;
    const idx = this.filteredEmployees.findIndex(e => e.employeeId === this.selectedEmployeeId);
    const nextIdx = (idx + 1) % this.filteredEmployees.length;
    this.selectedEmployeeId = this.filteredEmployees[nextIdx].employeeId;
    this.onEmployeeChange();
  }

  onPrevEmployee() {
    if (!this.filteredEmployees.length) return;
    const idx = this.filteredEmployees.findIndex(e => e.employeeId === this.selectedEmployeeId);
    const prevIdx = (idx - 1 + this.filteredEmployees.length) % this.filteredEmployees.length;
    this.selectedEmployeeId = this.filteredEmployees[prevIdx].employeeId;
    this.onEmployeeChange();
  }

  async onYearMonthChange() {
    await this.loadSalaryAndBonus();
    await this.loadHistory();
  }

  async loadSalaryAndBonus() {
    const ym = this.selectedYear && this.selectedMonth ? `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}` : '';
    if (ym && this.employee) {
      const salaries = await this.firestoreService.getSalariesByCompanyKey(this.companyKey);
      this.salary = salaries.find(s => s.employeeId === this.employeeId && s.targetYearMonth === ym);
      const bonuses = await this.firestoreService.getBonusesByCompanyKey(this.companyKey);
      this.bonuses = bonuses.filter(b => b.employeeId === this.employeeId && b.targetYearMonth === ym);
    }
    // 履歴も再取得
    await this.loadHistory();
  }

  async onEdit(type: 'salary' | 'bonus') {
    this.editMode = type;
    if (type === 'salary' && this.salary) {
      this.editSalaryForm = {
        paymentDate: this.salary.paymentDate || '',
        basicSalary: this.salary.basicSalary,
        overtimeSalary: this.salary.overtimeSalary,
        commuteAllowance: this.salary.commuteAllowance ?? 0,
        positionAllowance: this.salary.positionAllowance ?? 0,
        remarks: this.salary.remarks || '',
        commuteAllowancePeriodFrom: this.salary.commuteAllowancePeriodFrom || '',
        commuteAllowancePeriodTo: this.salary.commuteAllowancePeriodTo || '',
        commuteAllowanceMonths: this.salary.commuteAllowanceMonths || 1,
        otherAllowances: this.salary.otherAllowances ? JSON.parse(JSON.stringify(this.salary.otherAllowances)) : [],
        inKindAllowances: this.salary.inKindAllowances ? JSON.parse(JSON.stringify(this.salary.inKindAllowances)) : [],
        retroAllowances: this.salary.retroAllowances ? JSON.parse(JSON.stringify(this.salary.retroAllowances)) : [],
        actualExpenses: this.salary.actualExpenses ? JSON.parse(JSON.stringify(this.salary.actualExpenses)) : [],
        totalOtherAllowance: this.salary.totalOtherAllowance || 0,
        totalInKind: this.salary.totalInKind || 0,
        totalRetro: this.salary.totalRetro || 0,
        totalActualExpense: this.salary.totalActualExpense || 0
      };
    } else if (type === 'bonus') {
      this.editBonusForms = this.bonuses.length > 0 ? this.bonuses.map(b => ({
        bonusType: b.bonusType,
        bonusName: b.bonusName,
        paymentDate: b.paymentDate || '',
        bonus: b.bonus,
        remarks: b.remarks || ''
      })) : [{}];
    }
  }

  onCancelEdit() {
    this.editMode = null;
    this.editSalaryForm = {
      otherAllowances: [],
      inKindAllowances: [],
      retroAllowances: [],
      actualExpenses: [],
      totalOtherAllowance: 0,
      totalInKind: 0,
      totalRetro: 0,
      totalActualExpense: 0
    };
    this.editBonusForms = [{}];
  }

  calcEditTotalSalary() {
    const basic = Number(this.editSalaryForm.basicSalary) || 0;
    const overtime = Number(this.editSalaryForm.overtimeSalary) || 0;
    const commute = Number(this.editSalaryForm.commuteAllowance) || 0;
    const position = Number(this.editSalaryForm.positionAllowance) || 0;
    this.editSalaryForm.totalOtherAllowance = this.editSalaryForm.otherAllowances.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
    this.editSalaryForm.totalInKind = this.editSalaryForm.inKindAllowances.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
    this.editSalaryForm.totalRetro = this.editSalaryForm.retroAllowances.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
    this.editSalaryForm.totalActualExpense = this.editSalaryForm.actualExpenses.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
    // totalAllowance: 基本給を除いた手当の合計
    this.editSalaryForm.totalAllowance = this.editSalaryForm.totalOtherAllowance
      + this.editSalaryForm.totalInKind
      + this.editSalaryForm.totalRetro
      + this.editSalaryForm.totalActualExpense
      + overtime
      + commute
      + position;
    return basic + this.editSalaryForm.totalAllowance;
  }

  addBonusRow() {
    this.editBonusForms.push({});
  }
  removeBonusRow(i: number) {
    if (this.editBonusForms.length > 1) this.editBonusForms.splice(i, 1);
  }

  addOtherAllowance() {
    this.editSalaryForm.otherAllowances.push({ name: '', amount: 0 });
  }
  removeOtherAllowance(i: number) {
    this.editSalaryForm.otherAllowances.splice(i, 1);
    this.calcEditTotalSalary();
  }
  addInKindAllowance() {
    this.editSalaryForm.inKindAllowances.push({ name: '', amount: 0 });
  }
  removeInKindAllowance(i: number) {
    this.editSalaryForm.inKindAllowances.splice(i, 1);
    this.calcEditTotalSalary();
  }
  addRetroAllowance() {
    this.editSalaryForm.retroAllowances.push({ name: '', amount: 0 });
  }
  removeRetroAllowance(i: number) {
    this.editSalaryForm.retroAllowances.splice(i, 1);
    this.calcEditTotalSalary();
  }
  addActualExpense() {
    this.editSalaryForm.actualExpenses.push({ name: '', amount: 0 });
  }
  removeActualExpense(i: number) {
    this.editSalaryForm.actualExpenses.splice(i, 1);
    this.calcEditTotalSalary();
  }

  async onSaveSalaryEdit() {
    if (!this.salary || !this.employee) return;
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    // totalOtherAllowance: otherAllowances配列内のamountの合計
    const totalOtherAllowance = (this.editSalaryForm.otherAllowances || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    const totalInKind = (this.editSalaryForm.inKindAllowances || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    const totalRetro = (this.editSalaryForm.retroAllowances || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    const totalActualExpense = (this.editSalaryForm.actualExpenses || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    const overtime = Number(this.editSalaryForm.overtimeSalary) || 0;
    const commute = Number(this.editSalaryForm.commuteAllowance) || 0;
    const position = Number(this.editSalaryForm.positionAllowance) || 0;
    // totalAllowance: 基本給を除いた手当の合計
    const totalAllowance = totalOtherAllowance + totalInKind + totalRetro + totalActualExpense + overtime + commute + position;
    // totalSalary: basicSalary + totalAllowance
    const totalSalary = (Number(this.editSalaryForm.basicSalary) || 0)
      + totalAllowance;
    const newSalary = {
      ...this.salary,
      paymentDate: this.editSalaryForm.paymentDate || '',
      basicSalary: Number(this.editSalaryForm.basicSalary) || 0,
      overtimeSalary: Number(this.editSalaryForm.overtimeSalary) || 0,
      commuteAllowance: Number(this.editSalaryForm.commuteAllowance) || 0,
      positionAllowance: Number(this.editSalaryForm.positionAllowance) || 0,
      otherAllowances: this.editSalaryForm.otherAllowances,
      totalOtherAllowance: totalOtherAllowance,
      inKindAllowances: this.editSalaryForm.inKindAllowances,
      totalInKind: totalInKind,
      retroAllowances: this.editSalaryForm.retroAllowances,
      totalRetro: totalRetro,
      actualExpenses: this.editSalaryForm.actualExpenses,
      totalActualExpense: totalActualExpense,
      totalAllowance,
      totalSalary,
      remarks: this.editSalaryForm.remarks || '',
      commuteAllowancePeriodFrom: this.editSalaryForm.commuteAllowancePeriodFrom || '',
      commuteAllowancePeriodTo: this.editSalaryForm.commuteAllowancePeriodTo || '',
      commuteAllowanceMonths: this.editSalaryForm.commuteAllowanceMonths || 1,
      promotion: this.editSalaryForm.promotion || '',
    };
    await this.firestoreService.updateSalary(this.companyKey, this.employee.employeeId, ym, newSalary);
    await this.saveHistory('salary', this.salary, newSalary);
    this.editMode = null;
    await this.loadSalaryAndBonus();
    await this.loadHistory();
  }

  // 賞与編集開始
  onEditBonus(i: number) {
    this.editBonusIndex = i;
    this.isAddingBonus = false;
    this.editBonusForm = { ...this.bonuses[i] };
  }
  // 賞与新規追加
  onAddBonus() {
    this.editBonusIndex = -1;
    this.isAddingBonus = true;
    this.editBonusForm = { bonusType: '', bonusName: '', paymentDate: '', bonus: '', remarks: '' };
  }
  // 賞与編集キャンセル
  onCancelBonusEdit() {
    this.editBonusIndex = null;
    this.isAddingBonus = false;
    this.editBonusForm = {};
  }
  // 賞与保存（編集）
  async onSaveBonusEdit(i: number) {
    if (!this.employee) return;
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const beforeBonuses = JSON.parse(JSON.stringify(this.bonuses));
    const bonus = { ...this.editBonusForm, employeeId: this.employee.employeeId, companyKey: this.companyKey, targetYearMonth: ym, paymentDate: this.editBonusForm.paymentDate || '', bonus: Number(this.editBonusForm.bonus) || 0 };
    await this.firestoreService.updateBonus(this.companyKey, this.employee.employeeId, ym, bonus);
    
    const afterBonuses = JSON.parse(JSON.stringify(this.bonuses));
    afterBonuses[i] = bonus;
    await this.saveHistory('bonus', beforeBonuses, afterBonuses);

    this.editBonusIndex = null;
    this.editBonusForm = {};
    await this.loadSalaryAndBonus();
    await this.loadHistory();
  }
  // 賞与保存（新規追加）
  async onSaveBonusAdd() {
    if (!this.employee) return;
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const beforeBonuses = JSON.parse(JSON.stringify(this.bonuses));
    const bonus = { ...this.editBonusForm, employeeId: this.employee.employeeId, companyKey: this.companyKey, targetYearMonth: ym, paymentDate: this.editBonusForm.paymentDate || '', bonus: Number(this.editBonusForm.bonus) || 0 };
    await this.firestoreService.updateBonus(this.companyKey, this.employee.employeeId, ym, bonus);

    const afterBonuses = [...beforeBonuses, bonus];
    await this.saveHistory('bonus', beforeBonuses, afterBonuses);

    this.isAddingBonus = false;
    this.editBonusForm = {};
    await this.loadSalaryAndBonus();
    await this.loadHistory();
  }

  async loadHistory() {
    if (!this.companyKey || !this.employeeId) return;
    const salaryHistory = await this.firestoreService.getSalaryHistory(this.companyKey, this.employeeId);
    const bonusHistory = await this.firestoreService.getBonusHistory(this.companyKey, this.employeeId);
    // Timestamp型をDate型に変換
    const convertDate = (arr: any[]) => arr.map(h => ({
      ...h,
      date: h.date && typeof h.date.toDate === 'function' ? h.date.toDate() : h.date
    }));
    this.historyList = [
      ...convertDate(salaryHistory || []),
      ...convertDate(bonusHistory || [])
    ].sort((a, b) => b.date - a.date);
  }

  async saveHistory(type: 'salary' | 'bonus', before: any, after: any) {
    const user = this.currentUser?.displayName || this.currentUser?.email || 'unknown';
    const date = new Date();
    const targetYearMonth = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    if (type === 'salary') {
      for (const key of ['basicSalary','overtimeSalary','commuteAllowance','positionAllowance','totalSalary','remarks','commuteAllowancePeriodFrom','commuteAllowancePeriodTo','commuteAllowanceMonths']) {
        const fieldName = SalaryFieldNameMap[key] || key;
        if ((before?.[key] ?? '') !== (after?.[key] ?? '')) {
          await this.firestoreService.addSalaryHistory(this.companyKey, this.employeeId, {
            field: fieldName,
            before: before?.[key] ?? '',
            after: after?.[key] ?? '',
            date,
            user,
            targetYearMonth
          });
        }
      }
    } else if (type === 'bonus') {
      for (let i = 0; i < Math.max((before?.length || 0), (after?.length || 0)); i++) {
        const b = before?.[i] || {};
        const a = after?.[i] || {};
        for (const key of ['bonusType','bonusName','bonus','remarks']) {
          const fieldName = BonusFieldNameMap[key] || key;
          if ((b?.[key] ?? '') !== (a?.[key] ?? '')) {
            await this.firestoreService.addBonusHistory(this.companyKey, this.employeeId, {
              field: `賞与${i+1}:${fieldName}`,
              before: b?.[key] ?? '',
              after: a?.[key] ?? '',
              date,
              user,
              targetYearMonth
            });
          }
        }
      }
    }
  }

  isNumber(val: any): boolean {
    return typeof val === 'number' && !isNaN(val);
  }

  onEditCommutePeriodChange() {
    const from = this.editSalaryForm.commuteAllowancePeriodFrom;
    const to = this.editSalaryForm.commuteAllowancePeriodTo;
    if (from && to) {
      const fromDate = new Date(from + '-01');
      const toDate = new Date(to + '-01');
      const months = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth()) + 1;
      this.editSalaryForm.commuteAllowanceMonths = months > 0 ? months : 1;
    } else {
      this.editSalaryForm.commuteAllowanceMonths = 1;
    }
  }

  onBack() {
    this.location.back();
  }

  // ボーナス削除
  async onDeleteBonus(i: number) {
    if (!confirm('この賞与情報を削除しますか？')) return;
    if (!this.employee) return;
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const bonusToDelete = this.bonuses[i];

    const beforeBonuses = JSON.parse(JSON.stringify(this.bonuses));
    const afterBonuses = this.bonuses.filter((_, index) => index !== i);

    await this.firestoreService.deleteBonus(this.companyKey, this.employee.employeeId, ym, bonusToDelete.paymentDate);
    await this.saveHistory('bonus', beforeBonuses, afterBonuses);

    await this.loadSalaryAndBonus();
    await this.loadHistory();
  }
}
