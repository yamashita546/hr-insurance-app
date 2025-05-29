import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { filter, take } from 'rxjs/operators';

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

  companyId: string = '';
  companyDisplayId: string = '';
  companyName: string = '';

  employees: any[] = [];
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
    let result = this.employees;
    if (this.selectedBranch) {
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
    this.employees = await this.firestoreService.getEmployeesByCompanyId(this.companyId);
    this.allSalaries = await this.firestoreService.getSalariesByCompanyId(this.companyId);
    this.allBonuses = await this.firestoreService.getBonusesByCompanyId(this.companyId);
    console.log('従業員:', this.employees);
    console.log('給与:', this.allSalaries);
    console.log('賞与:', this.allBonuses);
    // 年月でフィルタ
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    // 従業員ごとに給与・賞与を集計
    this.employees = this.employees.map(emp => {
      const salary = this.allSalaries.find(s => s.employeeId === emp.employeeId && s.targetYearMonth === ym);
      const bonuses = this.allBonuses.filter(b => b.employeeId === emp.employeeId && b.targetYearMonth === ym);
      const bonusSum = bonuses.reduce((sum, b) => sum + (b.bonus || 0), 0);
      return {
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
    console.log('onRegisterSalary called', employee);
    // 編集種別ダイアログを表示
    this.editEmployee = employee;
    this.showEditTypeDialog = true;
  }

  async onEditTypeSelect(type: 'salary' | 'bonus') {
    console.log('onEditTypeSelect called', type, this.editEmployee);
    this.showEditTypeDialog = false;
    if (type === 'salary') {
      await this.openSalaryEdit(this.editEmployee);
    } else if (type === 'bonus') {
      await this.onEditBonus(this.editEmployee);
    }
  }

  async openSalaryEdit(employee: any) {
    console.log('openSalaryEdit called', employee);
    this.editMode = 'salary';
    this.editTarget = employee;
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const salaries = await this.firestoreService.getSalariesByCompanyId(this.companyId);
    const salary = salaries.find(s => s.employeeId === employee.employeeId && s.targetYearMonth === ym);
    if (salary) {
      this.editSalaryForm = {
        basicSalary: salary.basicSalary,
        overtimeSalary: salary.overtimeSalary,
        commuteAllowance: salary.commuteAllowance ?? (salary.otherAllowances?.find((a: any) => a.otherAllowanceName === '通勤手当')?.otherAllowance || 0),
        positionAllowance: salary.positionAllowance ?? (salary.otherAllowances?.find((a: any) => a.otherAllowanceName === '役職手当')?.otherAllowance || 0),
        otherAllowance: salary.otherAllowance ?? (salary.otherAllowances?.find((a: any) => a.otherAllowanceName === 'その他手当')?.otherAllowance || 0),
        remarks: salary.remarks || ''
      };
    }
  }

  async onEditBonus(employee: any) {
    console.log('onEditBonus called', employee);
    this.editMode = 'bonus';
    this.editTarget = employee;
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const bonuses = await this.firestoreService.getBonusesByCompanyId(this.companyId);
    const bonusList = bonuses.filter(b => b.employeeId === employee.employeeId && b.targetYearMonth === ym);
    if (bonusList.length > 0) {
      this.editBonusForms = bonusList.map(b => ({
        bonusType: b.bonusType,
        bonusName: b.bonusType === 'その他賞与' ? b.bonusName : '',
        bonus: b.bonus,
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
        companyId: this.companyId,
        employeeId: this.editTarget.employeeId,
        targetYearMonth: ym,
        basicSalary: Number(this.editSalaryForm.basicSalary) || 0,
        overtimeSalary: Number(this.editSalaryForm.overtimeSalary) || 0,
        otherAllowances: otherAllowances,
        totalAllowance,
        totalSalary,
        remarks: this.editSalaryForm.remarks || '',
      };
      await this.firestoreService.updateSalary(salary.companyId, salary.employeeId, salary.targetYearMonth, salary);
      alert('給与情報を更新しました');
      this.editMode = null;
      this.editTarget = null;
      this.editSalaryForm = {};
      await this.loadData();
    } else if (this.editMode === 'bonus' && this.editTarget) {
      for (const bonus of this.editBonusForms) {
        const bonusData = {
          companyId: this.companyId,
          employeeId: this.editTarget.employeeId,
          targetYearMonth: ym,
          bonusType: bonus.bonusType,
          bonusName: bonus.bonusType === 'その他賞与' ? bonus.bonusName : '',
          bonus: Number(bonus.bonus) || 0,
          bonusTotal: Number(bonus.bonus) || 0,
          remarks: this.editBonusRemark || '',
        };
        await this.firestoreService.updateBonus(bonusData.companyId, bonusData.employeeId, bonusData.targetYearMonth, bonusData);
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
  }

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(
        filter(company => !!company && !!company.companyId),
        take(1)
      )
      .subscribe(async company => {
        this.companyId = company!.companyId;
        this.companyDisplayId = company!.displayId;
        this.companyName = company!.name;
        // 支社一覧をFirestoreから取得
        const offices = await this.firestoreService.getOffices(this.companyId);
        this.branches = ['全支社', ...offices.map(o => o.name)];
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
