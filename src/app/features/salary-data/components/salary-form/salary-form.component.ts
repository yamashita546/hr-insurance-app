import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { AppUser } from '../../../../core/models/user.model';
import { Office } from '../../../../core/models/company.model';
import { Employee } from '../../../../core/models/employee.model';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-salary-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './salary-form.component.html',
  styleUrl: './salary-form.component.css'
})
export class SalaryFormComponent implements OnInit {
  companyKey: string | null = null;
  offices: Office[] = [];
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  selectedOfficeId: string = '';
  selectedEmployeeId: string = '';
  selectedEmployeeObj: Employee | null = null;
  years: number[] = [];
  months: number[] = [];
  selectedYear: number;
  selectedMonth: number;
  activeTab: 'salary' | 'bonus' = 'salary';
  salaryForm: any = {};
  bonusForms: any[] = [{}];
  totalSalary: number = 0;
  isLoading = true;
  bonusRemark: string = '';
  showCsvDialog = false;
  csvYear: number = new Date().getFullYear();
  csvMonth: number = new Date().getMonth() + 1;
  csvOfficeId: string = '';
  csvImportData: any[] = [];
  csvImportErrors: string[] = [];
  csvFileName: string = '';
  showCsvImportPreview = false;
  csvTemplateType: 'salary' | 'bonus' = 'salary';
  showCsvImportTypeDialog = false;
  editMode: 'salary' | 'bonus' | null = null;
  editTarget: any = null;

  get bonusTotal() {
    return this.bonusForms.reduce((sum, b) => sum + (Number(b.bonus) || 0), 0);
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

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(
        filter(company => !!company && !!company.companyKey),
        take(1)
      )
      .subscribe(async company => {
        this.companyKey = company!.companyKey;
        this.offices = await this.firestoreService.getOffices(this.companyKey);
        this.employees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey);
        this.filterEmployees();
        this.isLoading = false;
        this.calculateTotalSalary();
      });
  }

  onOfficeChange() {
    this.filterEmployees();
    this.selectedEmployeeId = '';
    this.selectedEmployeeObj = null;
  }

  onEmployeeChange() {
    this.selectedEmployeeObj = this.filteredEmployees.find(emp => emp.employeeId === this.selectedEmployeeId) || null;
    if (this.selectedEmployeeObj) {
      this.selectedOfficeId = this.selectedEmployeeObj.officeId;
      this.filterEmployees();
    }
  }

  filterEmployees() {
    if (this.selectedOfficeId) {
      this.filteredEmployees = this.employees.filter(emp => emp.officeId === this.selectedOfficeId);
    } else {
      this.filteredEmployees = this.employees;
    }
  }

  calculateTotalSalary() {
    const basic = Number(this.salaryForm.basicSalary) || 0;
    const overtime = Number(this.salaryForm.overtimeSalary) || 0;
    const commute = Number(this.salaryForm.commuteAllowance) || 0;
    const position = Number(this.salaryForm.positionAllowance) || 0;
    const other = Number(this.salaryForm.otherAllowance) || 0;
    this.totalSalary = basic + overtime + commute + position + other;
  }

  addBonusRow() {
    this.bonusForms.push({});
  }

  removeBonusRow(i: number) {
    if (this.bonusForms.length > 1) this.bonusForms.splice(i, 1);
  }

  async onSave() {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    if (this.activeTab === 'salary') {
      // 給与バリデーション
      if (!this.selectedEmployeeObj) {
        alert('従業員IDを選択してください');
        return;
      }
      if (!this.salaryForm.basicSalary || isNaN(Number(this.salaryForm.basicSalary))) {
        alert('基本給を入力してください');
        return;
      }
      if (!this.selectedYear || !this.selectedMonth) {
        alert('対象年・対象月を選択してください');
        return;
      }
      // 既存給与データの重複チェック
      const existingSalaries = await this.firestoreService.getSalariesByCompanyKey(this.companyKey!);
      const salaryExists = existingSalaries.some(s => s.employeeId === this.selectedEmployeeObj!.employeeId && s.targetYearMonth === ym);
      if (salaryExists) {
        alert('既に給与が登録されています。');
        return;
      }
      const otherAllowances = [];
      if (this.salaryForm.commuteAllowance) {
        otherAllowances.push({
          otherAllowanceName: '通勤手当',
          otherAllowance: Number(this.salaryForm.commuteAllowance) || 0
        });
      }
      if (this.salaryForm.positionAllowance) {
        otherAllowances.push({
          otherAllowanceName: '役職手当',
          otherAllowance: Number(this.salaryForm.positionAllowance) || 0
        });
      }
      if (this.salaryForm.otherAllowance) {
        otherAllowances.push({
          otherAllowanceName: 'その他手当',
          otherAllowance: Number(this.salaryForm.otherAllowance) || 0
        });
      }
      const totalAllowance = otherAllowances.reduce((sum, a) => sum + (a.otherAllowance || 0), 0);
      const totalSalary = (Number(this.salaryForm.basicSalary) || 0) + (Number(this.salaryForm.overtimeSalary) || 0) + totalAllowance;
      const salary = {
        companyKey: this.companyKey,
        employeeId: this.selectedEmployeeObj.employeeId,
        targetYearMonth: ym,
        basicSalary: Number(this.salaryForm.basicSalary) || 0,
        overtimeSalary: Number(this.salaryForm.overtimeSalary) || 0,
        otherAllowances: otherAllowances,
        totalAllowance,
        totalSalary,
        remarks: this.salaryForm.remarks || '',
      };
      try {
        await this.firestoreService.addSalary(salary);
        alert('保存しました');
        this.onClear();
        return;
      } catch (e: any) {
        alert('保存時にエラーが発生しました: ' + (e?.message || e));
        return;
      }
    } else if (this.activeTab === 'bonus') {
      // 賞与バリデーション
      if (!this.selectedEmployeeObj) {
        alert('従業員IDを選択してください');
        return;
      }
      if (!this.selectedYear || !this.selectedMonth) {
        alert('対象年・対象月を選択してください');
        return;
      }
      for (const [i, bonus] of this.bonusForms.entries()) {
        if (!bonus.bonusType) {
          alert(`賞与${i + 1}行目の賞与種類を選択してください`);
          return;
        }
        if (bonus.bonusType === 'その他賞与' && !bonus.bonusName) {
          alert(`賞与${i + 1}行目の賞与名を入力してください`);
          return;
        }
      }
      // 既存賞与データの重複チェック
      const existingBonuses = await this.firestoreService.getBonusesByCompanyKey(this.companyKey!);
      const bonusExists = existingBonuses.some(b => b.employeeId === this.selectedEmployeeObj!.employeeId && b.targetYearMonth === ym);
      if (bonusExists) {
        alert('既に賞与が登録されています。');
        return;
      }
      for (const bonus of this.bonusForms) {
        if (!bonus.bonusType) continue;
        const bonusData = {
          companyKey: this.companyKey,
          employeeId: this.selectedEmployeeObj.employeeId,
          targetYearMonth: ym,
          bonusName: bonus.bonusType === 'その他賞与' ? bonus.bonusName : '',
          bonusType: bonus.bonusType,
          bonus: Number(bonus.bonus) || 0,
          bonusTotal: this.bonusTotal,
          remarks: this.bonusRemark || '',
        };
        try {
          await this.firestoreService.addBonus(bonusData);
        } catch (e: any) {
          alert('賞与保存時にエラーが発生しました: ' + (e?.message || e));
          return;
        }
      }
      alert('保存しました');
      this.onClear();
    }
  }

  onClear() {
    this.salaryForm = {};
    this.bonusForms = [{}];
    this.totalSalary = 0;
  }

  onShowHistory() {
    // 履歴を見るボタン押下時の処理があればここに
  }

  onCsvUpload(event: Event) {
    console.log('onCsvUpload called', event);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    console.log('selected file:', file);
    this.csvFileName = file ? file.name : '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      const { data, errors } = this.parseCsv(text);
      this.csvImportData = data;
      this.csvImportErrors = errors;
      this.showCsvImportPreview = true;
    };
    reader.readAsText(file, 'utf-8');
  }

  parseCsv(text: string): { data: any[], errors: string[] } {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { data: [], errors: ['CSVにデータがありません'] };
    const headers = lines[0].split(',');
    const data: any[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length !== headers.length) {
        errors.push(`${i+1}行目: 列数が一致しません`);
        continue;
      }
      const row: any = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = cols[j];
      }
      // 必須項目チェック
      if (!row['employeeId']) {
        errors.push(`${i+1}行目: employeeIdが未入力です`);
        continue;
      }
      if (!row['targetYear'] || !row['targetMonth']) {
        errors.push(`${i+1}行目: targetYearまたはtargetMonthが未入力です`);
        continue;
      }
      data.push(row);
    }
    return { data, errors };
  }

  async onConfirmCsvImport() {
    if (this.csvImportErrors.length > 0) {
      alert('エラーがあります。修正してください。');
      return;
    }
    let overwriteRows: any[] = [];
    if (this.csvTemplateType === 'salary') {
      // 既存給与データ取得
      const existingSalaries = await this.firestoreService.getSalariesByCompanyKey(this.companyKey!);
      overwriteRows = this.csvImportData.filter(row =>
        existingSalaries.some(s => s.employeeId === row.employeeId && s.targetYearMonth === `${row.targetYear}-${String(row.targetMonth).padStart(2, '0')}`)
      );
    } else if (this.csvTemplateType === 'bonus') {
      // 既存賞与データ取得
      const existingBonuses = await this.firestoreService.getBonusesByCompanyKey(this.companyKey!);
      overwriteRows = this.csvImportData.filter(row =>
        existingBonuses.some(b => b.employeeId === row.employeeId && b.targetYearMonth === `${row.targetYear}-${String(row.targetMonth).padStart(2, '0')}`)
      );
    }
    if (overwriteRows.length > 0) {
      const msg = overwriteRows.map(row => `従業員ID: ${row.employeeId}, 年月: ${row.targetYear}-${String(row.targetMonth).padStart(2, '0')}`).join('\n');
      const typeLabel = this.csvTemplateType === 'salary' ? '給与' : '賞与';
      const confirmMsg = `${typeLabel}が既に登録されています。\n上書きしますか？\n\n重複項目:\n${msg}`;
      if (!window.confirm(confirmMsg)) {
        this.csvImportData = [];
        this.csvImportErrors = [];
        this.csvFileName = '';
        this.showCsvImportPreview = false;
        return;
      }
    }
    if (this.csvTemplateType === 'salary') {
      for (const row of this.csvImportData) {
        const totalAllowance = (Number(row.commuteAllowance) || 0) + (Number(row.positionAllowance) || 0) + (Number(row.otherAllowance) || 0);
        const totalSalary = (Number(row.basicSalary) || 0) + (Number(row.overtimeSalary) || 0) + totalAllowance;
        const salary = {
          companyKey: row.companyKey || this.companyKey,
          employeeId: row.employeeId,
          targetYearMonth: `${row.targetYear}-${String(row.targetMonth).padStart(2, '0')}`,
          basicSalary: Number(row.basicSalary) || 0,
          overtimeSalary: Number(row.overtimeSalary) || 0,
          commuteAllowance: Number(row.commuteAllowance) || 0,
          positionAllowance: Number(row.positionAllowance) || 0,
          otherAllowance: Number(row.otherAllowance) || 0,
          totalAllowance,
          totalSalary,
          remarks: row.remarks || '',
        };
        console.log('import salary:', salary);
        const isOverwrite = overwriteRows.some(orow => orow.employeeId === row.employeeId && orow.targetYear === row.targetYear && orow.targetMonth === row.targetMonth);
        if (isOverwrite) {
          await this.firestoreService.updateSalary(salary.companyKey!, salary.employeeId, salary.targetYearMonth, salary);
        } else {
          await this.firestoreService.addSalary(salary);
        }
      }
    } else if (this.csvTemplateType === 'bonus') {
      for (const row of this.csvImportData) {
        const bonusData = {
          companyKey: row.companyKey || this.companyKey,
          employeeId: row.employeeId,
          targetYearMonth: `${row.targetYear}-${String(row.targetMonth).padStart(2, '0')}`,
          bonusType: row.bonusType || '',
          bonusName: row.bonusType === 'その他賞与' ? (row.bonusName || '') : '',
          bonus: Number(row.bonus) || 0,
          bonusTotal: Number(row.bonus) || 0, // 単一行の場合は同額
          remarks: row.remarks || '',
        };
        console.log('import bonus:', bonusData);
        const isOverwrite = overwriteRows.some(orow => orow.employeeId === row.employeeId && orow.targetYear === row.targetYear && orow.targetMonth === row.targetMonth);
        if (isOverwrite) {
          await this.firestoreService.updateBonus(bonusData.companyKey!, bonusData.employeeId, bonusData.targetYearMonth, bonusData);
        } else {
          await this.firestoreService.addBonus(bonusData);
        }
      }
    }
    alert('インポートが完了しました');
    this.csvImportData = [];
    this.csvImportErrors = [];
    this.csvFileName = '';
    this.showCsvImportPreview = false;
  }

  onCancelCsvImport() {
    this.csvImportData = [];
    this.csvImportErrors = [];
    this.csvFileName = '';
    this.showCsvImportPreview = false;
  }

  async onDownloadCsvTemplate() {
    console.log('onDownloadCsvTemplate called');
    console.log('offices:', this.offices);
    this.csvYear = this.selectedYear;
    this.csvMonth = this.selectedMonth;
    this.csvOfficeId = '';
    this.showCsvDialog = true;
  }

  onCsvDialogCancel() {
    this.showCsvDialog = false;
  }

  async onCsvDialogExport() {
    // 対象従業員を絞り込み
    let targetEmployees = this.employees;
    if (this.csvOfficeId) {
      targetEmployees = targetEmployees.filter(emp => emp.officeId === this.csvOfficeId);
    }
    if (this.csvTemplateType === 'salary') {
      // 給与CSVひな型
      const header = [
        'companyKey', 'employeeId', 'lastName', 'firstName', 'officeId', 'officeName',
        'targetYear', 'targetMonth', 'basicSalary', 'overtimeSalary', 'commuteAllowance', 'positionAllowance', 'otherAllowance', 'remarks'
      ];
      const rows = targetEmployees.map(emp => {
        return [
          emp.companyKey || this.companyKey,
          emp.employeeId || '',
          emp.lastName || '',
          emp.firstName || '',
          emp.officeId || '',
          emp.officeName || '',
          this.csvYear,
          this.csvMonth,
          '', '', '', '', '', '' // 空欄（入力用）
        ];
      });
      const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salary_template_${this.csvYear}_${this.csvMonth}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      this.showCsvDialog = false;
    } else if (this.csvTemplateType === 'bonus') {
      // 賞与CSVひな型
      const header = [
        'companyKey', 'employeeId', 'lastName', 'firstName', 'officeId', 'officeName',
        'targetYear', 'targetMonth', 'bonusType', 'bonusName', 'bonus', 'remarks'
      ];
      const rows = targetEmployees.map(emp => {
        return [
          emp.companyKey || this.companyKey,
          emp.employeeId || '',
          emp.lastName || '',
          emp.firstName || '',
          emp.officeId || '',
          emp.officeName || '',
          this.csvYear,
          this.csvMonth,
          '', '', '', '' // 空欄（入力用）
        ];
      });
      const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bonus_template_${this.csvYear}_${this.csvMonth}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      this.showCsvDialog = false;
    }
  }

  onShowCsvImportTypeDialog() {
    this.showCsvImportTypeDialog = true;
  }

  onCsvImportTypeDialogOk(csvInput: HTMLInputElement) {
    this.showCsvImportTypeDialog = false;
    setTimeout(() => csvInput.click(), 0);
  }

  onCsvImportTypeDialogCancel() {
    this.showCsvImportTypeDialog = false;
  }

  async onRegisterSalary(employee: any) {
    // 給与編集モード
    this.editMode = 'salary';
    this.editTarget = employee;
    // 対象年月・従業員IDで既存データ取得
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const salaries = await this.firestoreService.getSalariesByCompanyKey(this.companyKey!);
    const salary = salaries.find(s => s.employeeId === employee.employeeId && s.targetYearMonth === ym);
    if (salary) {
      this.selectedEmployeeId = employee.employeeId;
      this.selectedEmployeeObj = this.employees.find(e => e.employeeId === employee.employeeId) || null;
      this.salaryForm = {
        basicSalary: salary.basicSalary,
        overtimeSalary: salary.overtimeSalary,
        commuteAllowance: salary.commuteAllowance ?? (salary.otherAllowances?.find((a: any) => a.otherAllowanceName === '通勤手当')?.otherAllowance || 0),
        positionAllowance: salary.positionAllowance ?? (salary.otherAllowances?.find((a: any) => a.otherAllowanceName === '役職手当')?.otherAllowance || 0),
        otherAllowance: salary.otherAllowance ?? (salary.otherAllowances?.find((a: any) => a.otherAllowanceName === 'その他手当')?.otherAllowance || 0),
        remarks: salary.remarks || ''
      };
      this.calculateTotalSalary();
    }
  }

  async onEditBonus(employee: any) {
    // 賞与編集モード
    this.editMode = 'bonus';
    this.editTarget = employee;
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    const bonuses = await this.firestoreService.getBonusesByCompanyKey(this.companyKey!);
    const bonusList = bonuses.filter(b => b.employeeId === employee.employeeId && b.targetYearMonth === ym);
    if (bonusList.length > 0) {
      this.selectedEmployeeId = employee.employeeId;
      this.selectedEmployeeObj = this.employees.find(e => e.employeeId === employee.employeeId) || null;
      this.bonusForms = bonusList.map(b => ({
        bonusType: b.bonusType,
        bonusName: b.bonusName,
        bonus: b.bonus,
      }));
      this.bonusRemark = bonusList[0].remarks || '';
    }
  }

  async onEditSave() {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    if (this.editMode === 'salary' && this.selectedEmployeeObj) {
      const otherAllowances = [];
      if (this.salaryForm.commuteAllowance) {
        otherAllowances.push({
          otherAllowanceName: '通勤手当',
          otherAllowance: Number(this.salaryForm.commuteAllowance) || 0
        });
      }
      if (this.salaryForm.positionAllowance) {
        otherAllowances.push({
          otherAllowanceName: '役職手当',
          otherAllowance: Number(this.salaryForm.positionAllowance) || 0
        });
      }
      if (this.salaryForm.otherAllowance) {
        otherAllowances.push({
          otherAllowanceName: 'その他手当',
          otherAllowance: Number(this.salaryForm.otherAllowance) || 0
        });
      }
      const totalAllowance = otherAllowances.reduce((sum, a) => sum + (a.otherAllowance || 0), 0);
      const totalSalary = (Number(this.salaryForm.basicSalary) || 0) + (Number(this.salaryForm.overtimeSalary) || 0) + totalAllowance;
      const salary = {
        companyKey: this.companyKey,
        employeeId: this.selectedEmployeeObj.employeeId,
        targetYearMonth: ym,
        basicSalary: Number(this.salaryForm.basicSalary) || 0,
        overtimeSalary: Number(this.salaryForm.overtimeSalary) || 0,
        otherAllowances: otherAllowances,
        totalAllowance,
        totalSalary,
        remarks: this.salaryForm.remarks || '',
      };
      await this.firestoreService.updateSalary(salary.companyKey!, salary.employeeId, salary.targetYearMonth, salary);
      alert('給与情報を更新しました');
      this.editMode = null;
      this.editTarget = null;
      this.onClear();
    } else if (this.editMode === 'bonus' && this.selectedEmployeeObj) {
      for (const bonus of this.bonusForms) {
        const bonusData = {
          companyKey: this.companyKey,
          employeeId: this.selectedEmployeeObj.employeeId,
          targetYearMonth: ym,
          bonusType: bonus.bonusType,
          bonusName: bonus.bonusType === 'その他賞与' ? bonus.bonusName : '',
          bonus: Number(bonus.bonus) || 0,
          bonusTotal: this.bonusTotal,
          remarks: this.bonusRemark || '',
        };
        await this.firestoreService.updateBonus(bonusData.companyKey!, bonusData.employeeId, bonusData.targetYearMonth, bonusData);
      }
      alert('賞与情報を更新しました');
      this.editMode = null;
      this.editTarget = null;
      this.onClear();
    }
  }

  onEditCancel() {
    this.editMode = null;
    this.editTarget = null;
    this.onClear();
  }

  onCommutePeriodChange() {
    const from = this.salaryForm.commuteAllowancePeriodFrom;
    const to = this.salaryForm.commuteAllowancePeriodTo;
    if (from && to) {
      const fromDate = new Date(from + '-01');
      const toDate = new Date(to + '-01');
      const months = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth()) + 1;
      this.salaryForm.commuteAllowanceMonths = months > 0 ? months : 1;
    } else {
      this.salaryForm.commuteAllowanceMonths = 1;
    }
  }
}

