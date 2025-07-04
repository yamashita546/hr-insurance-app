import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { filter, take } from 'rxjs/operators';
import { isEmployeeSelectable } from '../../../../core/services/empoloyee.active';

@Component({
  selector: 'app-salary-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './salary-registration.component.html',
  styleUrl: './salary-registration.component.css'
})
export class SalaryRegistrationComponent {
  years: number[] = [];
  months: number[] = [];
  branches: string[] = ['本社', '東京支社'];
  selectedYear: number;
  selectedMonth: number;
  selectedBranch: string = '';
  searchKeyword: string = '';
  sortKey: string = '';
  sortAsc: boolean = true;

  companyKey: string = '';
  companyId: string = '';
  companyName: string = '';

  employees: any[] = [];
  allEmployees: any[] = [];
  allSalaries: any[] = [];
  allBonuses: any[] = [];

  editMode: 'salary' | 'bonus' | null = null;
  editTarget: any = null;
  editSalaryForm: any = {};
  editBonusForms: any[] = [{}];
  editBonusRemark: string = '';

  showEditTypeDialog: boolean = false;
  private editEmployee: any = null;

  get filteredEmployees() {
    let result = this.employees.filter(emp =>
      isEmployeeSelectable(emp, this.selectedYear?.toString(), this.selectedMonth?.toString())
    );
    if (this.selectedBranch && this.selectedBranch !== '全事業所') {
      result = result.filter(e => e.branch === this.selectedBranch);
    }
    if (this.searchKeyword) {
      result = result.filter(e => e.name.includes(this.searchKeyword));
    }
    if (this.sortKey) {
      result = result.slice().sort((a, b) => {
        const key = this.sortKey as keyof typeof a;
        if (a[key] < b[key]) return this.sortAsc ? -1 : 1;
        if (a[key] > b[key]) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }
    return result;
  }

  constructor(
    private userCompanyService: UserCompanyService,
    private firestoreService: FirestoreService
  ) {
    const now = new Date();
    const currentYear = now.getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
      this.years.push(y);
    }
    for (let m = 1; m <= 12; m++) {
      this.months.push(m);
    }
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth() + 1;
  }

  async loadData() {
    // Firestoreから従業員・給与・賞与データを取得
    this.allEmployees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey);
    this.allSalaries = await this.firestoreService.getSalariesByCompanyKey(this.companyKey);
    this.allBonuses = await this.firestoreService.getBonusesByCompanyKey(this.companyKey);
    // 年月でフィルタ
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    // isEmployeeSelectableでフィルタし、表示用データを作成
    this.employees = this.allEmployees
      .filter(emp => isEmployeeSelectable(emp, this.selectedYear?.toString(), this.selectedMonth?.toString()))
      .map(emp => {
        const salary = this.allSalaries.find(s => s.employeeId === emp.employeeId && s.targetYearMonth === ym);
        const bonuses = this.allBonuses.filter(b => b.employeeId === emp.employeeId && b.targetYearMonth === ym);
        const bonusSum = bonuses.reduce((sum, b) => sum + (b.bonus || 0), 0);
        return {
          ...emp, // 元データも保持
          name: emp.lastName + ' ' + emp.firstName,
          branch: emp.officeName || '',
          baseSalary: salary?.basicSalary || 0,
          overtime: salary?.overtimeSalary || 0,
          allowance: salary?.totalAllowance || 0,
          totalSalary: (salary?.totalSalary || 0) + bonusSum,
          bonus: bonusSum,
          status: salary || bonuses.length ? '登録済' : '未登録',
          employeeId: emp.employeeId
        };
      });
  }

  onSearch() {
    // 検索ボタン押下時の追加処理があればここに
  }

  sortBy(key: keyof typeof this.employees[0]) {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key as string;
      this.sortAsc = true;
    }
  }

  async onRegisterSalary(employee: any) {
    // 編集種別ダイアログを表示
    this.editEmployee = employee;
    this.showEditTypeDialog = true;
  }

  async onEditTypeSelect(type: 'salary' | 'bonus') {
    this.showEditTypeDialog = false;
    if (type === 'salary') {
      await this.openSalaryEdit(this.editEmployee);
    } else if (type === 'bonus') {
      await this.onEditBonus(this.editEmployee);
    }
  }

  async openSalaryEdit(employee: any) {
    this.editMode = 'salary';
    this.editTarget = employee;
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const salaries = await this.firestoreService.getSalariesByCompanyKey(this.companyKey);
    const salary = salaries.find(s => s.employeeId === employee.employeeId && s.targetYearMonth === ym);
    if (salary) {
      this.editSalaryForm = {
        basicSalary: salary.basicSalary,
        overtimeSalary: salary.overtimeSalary,
        commuteAllowance: salary.commuteAllowance ?? (salary.otherAllowances?.find((a: any) => a.otherAllowanceName === '通勤手当')?.otherAllowance || 0),
        positionAllowance: salary.positionAllowance ?? (salary.otherAllowances?.find((a: any) => a.otherAllowanceName === '役職手当')?.otherAllowance || 0),
        otherAllowance: salary.otherAllowance ?? (salary.otherAllowances?.find((a: any) => a.otherAllowanceName === 'その他手当')?.otherAllowance || 0),
        remarks: salary.remarks || '',
        paymentDate: salary.paymentDate || ''
      };
    }
  }

  async onEditBonus(employee: any) {
    this.editMode = 'bonus';
    this.editTarget = employee;
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const bonuses = await this.firestoreService.getBonusesByCompanyKey(this.companyKey);
    const bonusList = bonuses.filter(b => b.employeeId === employee.employeeId && b.targetYearMonth === ym);
    if (bonusList.length > 0) {
      this.editBonusForms = bonusList.map(b => ({
        bonusType: b.bonusType,
        bonusName: b.bonusType === 'その他賞与' ? b.bonusName : '',
        bonus: b.bonus,
        paymentDate: b.paymentDate || '',
      }));
      this.editBonusRemark = bonusList[0].remarks || '';
    }
  }

  async onEditSave() {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    if (this.editMode === 'salary' && this.editTarget) {
      const otherAllowances = [];
      if (this.editSalaryForm.commuteAllowance) {
        otherAllowances.push({
          otherAllowanceName: '通勤手当',
          otherAllowance: Number(this.editSalaryForm.commuteAllowance) || 0
        });
      }
      if (this.editSalaryForm.positionAllowance) {
        otherAllowances.push({
          otherAllowanceName: '役職手当',
          otherAllowance: Number(this.editSalaryForm.positionAllowance) || 0
        });
      }
      if (this.editSalaryForm.otherAllowance) {
        otherAllowances.push({
          otherAllowanceName: 'その他手当',
          otherAllowance: Number(this.editSalaryForm.otherAllowance) || 0
        });
      }
      const totalAllowance = otherAllowances.reduce((sum, a) => sum + (a.otherAllowance || 0), 0);
      const totalSalary = (Number(this.editSalaryForm.basicSalary) || 0) + (Number(this.editSalaryForm.overtimeSalary) || 0) + totalAllowance;
      const salary = {
        companyKey: this.companyKey,
        employeeId: this.editTarget.employeeId,
        targetYearMonth: ym,
        paymentDate: this.editSalaryForm.paymentDate || '',
        basicSalary: Number(this.editSalaryForm.basicSalary) || 0,
        overtimeSalary: Number(this.editSalaryForm.overtimeSalary) || 0,
        otherAllowances: otherAllowances,
        totalAllowance,
        totalSalary,
        remarks: this.editSalaryForm.remarks || '',
      };
      await this.firestoreService.updateSalary(salary.companyKey, salary.employeeId, salary.targetYearMonth, salary);
      alert('給与情報を更新しました');
      this.editMode = null;
      this.editTarget = null;
      this.editSalaryForm = {};
      await this.loadData();
    } else if (this.editMode === 'bonus' && this.editTarget) {
      for (const bonus of this.editBonusForms) {
        const bonusData = {
          companyKey: this.companyKey,
          employeeId: this.editTarget.employeeId,
          targetYearMonth: ym,
          paymentDate: bonus.paymentDate || '',
          bonusType: bonus.bonusType,
          bonusName: bonus.bonusType === 'その他賞与' ? bonus.bonusName : '',
          bonus: Number(bonus.bonus) || 0,
          bonusTotal: Number(bonus.bonus) || 0,
          remarks: this.editBonusRemark || '',
        };
        await this.firestoreService.updateBonus(bonusData.companyKey, bonusData.employeeId, bonusData.targetYearMonth, bonusData);
      }
      alert('賞与情報を更新しました');
      this.editMode = null;
      this.editTarget = null;
      this.editBonusForms = [{}];
      await this.loadData();
    }
  }

  onEditCancel() {
    this.editMode = null;
    this.editTarget = null;
    this.editSalaryForm = {};
    this.editBonusForms = [{}];
    this.editBonusRemark = '';
    this.showEditTypeDialog = false;
  }

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(
        filter(company => !!company && !!company.companyKey),
        take(1)
      )
      .subscribe(async company => {
        this.companyKey = company!.companyKey;
        this.companyId = company!.companyId;
        this.companyName = company!.name;
        // 支社一覧をFirestoreから取得
        const offices = await this.firestoreService.getOffices(this.companyKey);
        this.branches = ['全事業所', ...offices.map(o => o.name)];
        // 初期化後に必ずloadDataを呼ぶ
        setTimeout(() => this.loadData(), 0);
      });
  }

  onYearChange() {
    this.loadData();
  }
  onMonthChange() {
    this.loadData();
  }
  onBranchChange() {
    this.loadData();
  }
}
