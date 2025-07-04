import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { AppUser } from '../../../../core/models/user.model';
import { Office } from '../../../../core/models/company.model';
import { Employee } from '../../../../core/models/employee.model';
import { filter, take } from 'rxjs/operators';
import { isEmployeeSelectable } from '../../../../core/services/empoloyee.active';
import { Salary, Bonus, SalaryFieldNameMap, BonusFieldNameMap, PromotionTypeMap } from '../../../../core/models/salary.model';

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
  salaryForm: Partial<Salary> = this.getInitialSalaryForm();
  bonuses: Bonus[] = [];
  bonus: Partial<Bonus> = {};
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
  otherAllowances: { name: string, amount: number }[] = [];
  totalOtherAllowance: number = 0;
  inKindAllowances: { name: string, amount: number }[] = [];
  totalInKind: number = 0;
  retroAllowances: { name: string, amount: number }[] = [];
  totalRetro: number = 0;
  actualExpenses: { name: string, amount: number }[] = [];
  totalActualExpense: number = 0;
  allSalaries: any[] = [];
  salaryData: any;

  promotionTypeMap = PromotionTypeMap;
  promotionTypeKeys = Object.keys(PromotionTypeMap);

  get bonusTotal() {
    return Number(this.bonus?.bonus) || 0;
  }

  get activeOffices() {
    return this.offices.filter(o => o.isActive !== false);
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
      this.filteredEmployees = this.employees.filter(emp =>
        emp.officeId === this.selectedOfficeId &&
        isEmployeeSelectable(emp, this.selectedYear?.toString(), this.selectedMonth?.toString())
      );
    } else {
      this.filteredEmployees = this.employees.filter(emp =>
        isEmployeeSelectable(emp, this.selectedYear?.toString(), this.selectedMonth?.toString())
      );
    }
    // employeeIdの昇順でソート
    this.filteredEmployees.sort((a, b) => (a.employeeId > b.employeeId ? 1 : a.employeeId < b.employeeId ? -1 : 0));
  }

  calculateTotalSalary() {
    const basic = Number(this.salaryForm.basicSalary) || 0;
    const overtime = Number(this.salaryForm.overtimeSalary) || 0;
    const commute = Number(this.salaryForm.commuteAllowance) || 0;
    const position = Number(this.salaryForm.positionAllowance) || 0;
    this.totalOtherAllowance = this.otherAllowances.reduce((sum: number, a: {name: string, amount: number}) => sum + (Number(a.amount) || 0), 0);
    this.totalInKind = this.inKindAllowances.reduce((sum: number, a: {name: string, amount: number}) => sum + (Number(a.amount) || 0), 0);
    this.totalRetro = this.retroAllowances.reduce((sum: number, a: {name: string, amount: number}) => sum + (Number(a.amount) || 0), 0);
    this.totalActualExpense = this.actualExpenses.reduce((sum: number, a: {name: string, amount: number}) => sum + (Number(a.amount) || 0), 0);
    this.totalSalary = basic + overtime + commute + position + this.totalOtherAllowance + this.totalInKind + this.totalRetro + this.totalActualExpense;
  }

  addInKindAllowance() {
    this.inKindAllowances.push({ name: '', amount: 0 });
  }

  removeInKindAllowance(i: number) {
    this.inKindAllowances.splice(i, 1);
    this.calculateTotalSalary();
  }

  addRetroAllowance() {
    this.retroAllowances.push({ name: '', amount: 0 });
  }

  removeRetroAllowance(i: number) {
    this.retroAllowances.splice(i, 1);
    this.calculateTotalSalary();
  }

  addActualExpense() {
    this.actualExpenses.push({ name: '', amount: 0 });
  }

  removeActualExpense(i: number) {
    this.actualExpenses.splice(i, 1);
    this.calculateTotalSalary();
  }

  addOtherAllowance() {
    this.otherAllowances.push({ name: '', amount: 0 });
  }

  removeOtherAllowance(i: number) {
    this.otherAllowances.splice(i, 1);
    this.calculateTotalSalary();
  }

  async onSave() {
    if (!this.companyKey) return;
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;

    if (this.activeTab === 'salary') {
      // 給与保存
      if (!this.selectedEmployeeObj) {
        alert('従業員IDを選択してください');
        return;
      }
      if (!this.salaryForm.basicSalary) {
        alert('基本給を入力してください');
        return;
      }
      if (!this.salaryForm.paymentDate) {
        alert('支給日を選択してください');
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
      // 合計値計算
      const totalOtherAllowance = (this.otherAllowances || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const totalAllowance = (Number(this.salaryForm.overtimeSalary) || 0)
        + (Number(this.salaryForm.commuteAllowance) || 0)
        + totalOtherAllowance;
      const totalSalary = (Number(this.salaryForm.basicSalary) || 0)
        + totalAllowance
        + this.totalInKind
        + this.totalRetro
        + this.totalActualExpense;
      const salary = {
        companyKey: this.companyKey,
        employeeId: this.selectedEmployeeObj.employeeId,
        targetYearMonth: ym,
        paymentDate: this.salaryForm.paymentDate || '',
        basicSalary: Number(this.salaryForm.basicSalary) || 0,
        overtimeSalary: Number(this.salaryForm.overtimeSalary) || 0,
        commuteAllowance: Number(this.salaryForm.commuteAllowance) || 0,
        positionAllowance: Number(this.salaryForm.positionAllowance) || 0,
        otherAllowances: this.otherAllowances,
        totalOtherAllowance: totalOtherAllowance,
        inKindAllowances: this.inKindAllowances,
        totalInKind: this.totalInKind,
        retroAllowances: this.retroAllowances,
        totalRetro: this.totalRetro,
        actualExpenses: this.actualExpenses,
        totalActualExpense: this.totalActualExpense,
        totalAllowance,
        totalSalary,
        remarks: this.salaryForm.remarks || '',
        commuteAllowancePeriodFrom: this.salaryForm.commuteAllowancePeriodFrom || '',
        commuteAllowancePeriodTo: this.salaryForm.commuteAllowancePeriodTo || '',
        commuteAllowanceMonths: this.salaryForm.commuteAllowanceMonths || 1,
        promotion: this.salaryForm.promotion || 'noChange',
        createdAt: this.salaryData?.createdAt ? this.salaryData.createdAt : new Date(),
        updatedAt: new Date(),
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
      // 賞与保存
      if (!this.selectedEmployeeObj) {
        alert('従業員IDを選択してください');
        return;
      }
      if (!this.bonus.paymentDate) {
        alert('支給日を選択してください');
        return;
      }
      if (!this.selectedYear || !this.selectedMonth) {
        alert('対象年・対象月を選択してください');
        return;
      }
      if (!this.bonus.bonusType) {
        alert('賞与種類を選択してください');
        return;
      }
      if (this.bonus.bonusType === 'その他賞与' && !this.bonus.bonusName) {
        alert('賞与名を入力してください');
        return;
      }
      // 既存賞与データの重複チェック（同項目・同支給日のみ警告）
      const existingBonuses = await this.firestoreService.getBonusesByCompanyKey(this.companyKey!);
      const isDuplicate = existingBonuses.some(b =>
        b.employeeId === this.selectedEmployeeObj!.employeeId &&
        b.targetYearMonth === ym &&
        b.bonusType === this.bonus.bonusType &&
        (b.bonusName || '') === (this.bonus.bonusType === 'その他賞与' ? (this.bonus.bonusName || '') : '') &&
        b.paymentDate === (this.bonus.paymentDate || '')
      );
      if (isDuplicate) {
        if (!window.confirm('既に同項目、同支給日の賞与が登録されています。\n今回入力した内容を新たに追加しますか？')) {
          return;
        }
      }
      const bonusData = {
        companyKey: this.companyKey,
        employeeId: this.selectedEmployeeObj.employeeId,
        targetYearMonth: ym,
        paymentDate: this.bonus.paymentDate || '',
        bonusName: this.bonus.bonusType === 'その他賞与' ? this.bonus.bonusName : '',
        bonusType: this.bonus.bonusType || '',
        bonus: Number(this.bonus.bonus) || 0,
        bonusTotal: this.bonusTotal,
        remarks: this.bonusRemark || '',
      };
      try {
        await this.firestoreService.addBonus(bonusData as any);
      } catch (e: any) {
        alert('賞与保存時にエラーが発生しました: ' + (e?.message || e));
        return;
      }
      alert('保存しました');
      this.onClear();
    }
  }

  onClear() {
    this.salaryForm = this.getInitialSalaryForm();
    this.bonus = {};
    this.totalSalary = 0;
  }

  onShowHistory() {
    // 履歴を見るボタン押下時の処理があればここに
  }

  onCsvUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
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
      if (i === 1) continue; // 2行目（ダミーデータ）はスキップ
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
      // 配列項目のパース
      row.otherAllowances = [];
      row.inKindAllowances = [];
      row.retroAllowances = [];
      row.actualExpenses = [];
      for (let k = 0; k < 3; k++) {
        if (row[`otherAllowances[${k}].name`] || row[`otherAllowances[${k}].amount`]) {
          row.otherAllowances.push({
            name: row[`otherAllowances[${k}].name`] || '',
            amount: Number(row[`otherAllowances[${k}].amount`] || 0)
          });
        }
        if (row[`inKindAllowances[${k}].name`] || row[`inKindAllowances[${k}].amount`]) {
          row.inKindAllowances.push({
            name: row[`inKindAllowances[${k}].name`] || '',
            amount: Number(row[`inKindAllowances[${k}].amount`] || 0)
          });
        }
        if (row[`retroAllowances[${k}].name`] || row[`retroAllowances[${k}].amount`]) {
          row.retroAllowances.push({
            name: row[`retroAllowances[${k}].name`] || '',
            amount: Number(row[`retroAllowances[${k}].amount`] || 0)
          });
        }
        if (row[`actualExpenses[${k}].name`] || row[`actualExpenses[${k}].amount`]) {
          row.actualExpenses.push({
            name: row[`actualExpenses[${k}].name`] || '',
            amount: Number(row[`actualExpenses[${k}].amount`] || 0)
          });
        }
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
        // 各配列の合計値を計算
        const totalOtherAllowance = (row.otherAllowances || []).reduce((sum: number, item: { amount: number }) => sum + (Number(item.amount) || 0), 0);
        const totalInKind = (row.inKindAllowances || []).reduce((sum: number, item: { amount: number }) => sum + (Number(item.amount) || 0), 0);
        const totalRetro = (row.retroAllowances || []).reduce((sum: number, item: { amount: number }) => sum + (Number(item.amount) || 0), 0);
        const totalActualExpense = (row.actualExpenses || []).reduce((sum: number, item: { amount: number }) => sum + (Number(item.amount) || 0), 0);
        
        // 時間外手当、通勤手当、役職手当
        const overtime = Number(row.overtimeSalary) || 0;
        const commute = Number(row.commuteAllowance) || 0;
        const position = Number(row.positionAllowance) || 0;

        // 手当合計（基本給を除く全ての手当の合計）
        const totalAllowance = totalOtherAllowance + totalInKind + totalRetro + totalActualExpense + overtime + commute + position;
        
        // 総支給額（基本給 + 全ての手当）
        const totalSalary = (Number(row.basicSalary) || 0) + totalAllowance;

        const salary = {
          companyKey: row.companyKey || this.companyKey,
          employeeId: row.employeeId,
          targetYearMonth: `${row.targetYear}-${String(row.targetMonth).padStart(2, '0')}`,
          paymentDate: row.paymentDate || '',
          basicSalary: Number(row.basicSalary) || 0,
          overtimeSalary: overtime,
          commuteAllowance: commute,
          positionAllowance: position,
          otherAllowances: row.otherAllowances || [],
          totalOtherAllowance,
          inKindAllowances: row.inKindAllowances || [],
          totalInKind,
          retroAllowances: row.retroAllowances || [],
          totalRetro,
          actualExpenses: row.actualExpenses || [],
          totalActualExpense,
          totalAllowance,
          totalSalary,
          remarks: row.remarks || '',
          commuteAllowancePeriodFrom: row.commuteAllowancePeriodFrom || '',
          commuteAllowancePeriodTo: row.commuteAllowancePeriodTo || '',
          commuteAllowanceMonths: Number(row.commuteAllowanceMonths) || 1,
          promotion: row.promotion || 'noChange',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
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
          paymentDate: row.paymentDate || '',
          bonusType: row.bonusType || '',
          bonusName: row.bonusType === 'その他賞与' ? (row.bonusName || '') : '',
          bonus: Number(row.bonus) || 0,
          bonusTotal: Number(row.bonus) || 0, // 単一行の場合は同額
          remarks: row.remarks || '',
        };
        const isOverwrite = overwriteRows.some(orow => orow.employeeId === row.employeeId && orow.targetYear === row.targetYear && orow.targetMonth === row.targetMonth);
        if (isOverwrite) {
          await this.firestoreService.updateBonus(bonusData.companyKey!, bonusData.employeeId, bonusData.targetYearMonth, bonusData as any);
        } else {
          await this.firestoreService.addBonus(bonusData as any);
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
    let targetEmployees = this.employees.filter(emp =>
      isEmployeeSelectable(emp, this.csvYear?.toString(), this.csvMonth?.toString())
    );
    if (this.csvOfficeId) {
      targetEmployees = targetEmployees.filter(emp => emp.officeId === this.csvOfficeId);
    }
    if (this.csvTemplateType === 'salary') {
      // 給与CSVひな型
      const codeHeader = [
        'companyKey', 'employeeId', 'lastName', 'firstName', 'officeId',
        'targetYear', 'targetMonth',
        'paymentDate',
        'basicSalary', 'overtimeSalary', 'commuteAllowance',
        'commuteAllowancePeriodFrom', 'commuteAllowancePeriodTo', 'commuteAllowanceMonths',
        'positionAllowance',
        'otherAllowances[0].name', 'otherAllowances[0].amount',
        'inKindAllowances[0].name', 'inKindAllowances[0].amount',
        'retroAllowances[0].name', 'retroAllowances[0].amount',
        'actualExpenses[0].name', 'actualExpenses[0].amount',
        'totalAllowance', 'totalSalary', 'remarks'
      ];
      // 日本語ヘッダーもインデックス付きで出力
      const header = codeHeader;
      // ダミーデータ（入力例）
      const dummyRow = [
        'C0001', 'E0001', '山田', '太郎', 'O001',
        '2024', '6',
        '2024-06-01',
        '300000', '20000', '10000',
        '2024-06', '2024-08', '3',
        '5000',
        '家族手当', '10000',
        '社宅', '20000',
        '調整', '5000',
        '交通費', '8000',
        '35000', '355000', '例：6月分給与'
      ];
      const rows = targetEmployees.map(emp => {
        // 対象年月
        const ym = `${this.csvYear}-${String(this.csvMonth).padStart(2, '0')}`;
        // Firestoreから取得した給与データから該当データを検索
        const salary = this.allSalaries?.find(s => s.employeeId === emp.employeeId && s.targetYearMonth === ym) || {};
        // 各配列の合計値を計算
        const totalOtherAllowance = (salary.otherAllowances || []).reduce((sum: number, item: { amount: number }) => sum + (Number(item.amount) || 0), 0);
        const totalInKind = (salary.inKindAllowances || []).reduce((sum: number, item: { amount: number }) => sum + (Number(item.amount) || 0), 0);
        const totalRetro = (salary.retroAllowances || []).reduce((sum: number, item: { amount: number }) => sum + (Number(item.amount) || 0), 0);
        const totalActualExpense = (salary.actualExpenses || []).reduce((sum: number, item: { amount: number }) => sum + (Number(item.amount) || 0), 0);
        let overtime = Number(salary.overtimeSalary) || 0;
        let commute = Number(salary.commuteAllowance) || 0;
        let position = Number(salary.positionAllowance) || 0;
        let totalAllowance = (typeof salary.totalAllowance === 'number') ? salary.totalAllowance : (totalOtherAllowance + totalInKind + totalRetro + totalActualExpense + overtime + commute + position);
        return [
          emp.companyKey || this.companyKey,
          emp.employeeId || '',
          emp.lastName || '',
          emp.firstName || '',
          emp.officeId || '',
          this.csvYear,
          this.csvMonth,
          salary.paymentDate || '',
          salary.basicSalary || '',
          salary.overtimeSalary || '',
          salary.commuteAllowance || '',
          salary.commuteAllowancePeriodFrom || '',
          salary.commuteAllowancePeriodTo || '',
          salary.commuteAllowanceMonths || '',
          salary.positionAllowance || '',
          (salary.otherAllowances && salary.otherAllowances[0]?.name) || '',
          (salary.otherAllowances && salary.otherAllowances[0]?.amount) || '',
          (salary.inKindAllowances && salary.inKindAllowances[0]?.name) || '',
          (salary.inKindAllowances && salary.inKindAllowances[0]?.amount) || '',
          (salary.retroAllowances && salary.retroAllowances[0]?.name) || '',
          (salary.retroAllowances && salary.retroAllowances[0]?.amount) || '',
          (salary.actualExpenses && salary.actualExpenses[0]?.name) || '',
          (salary.actualExpenses && salary.actualExpenses[0]?.amount) || '',
          totalAllowance,
          salary.totalSalary || '',
          salary.remarks || ''
        ];
      });
      const csv = [header.join(','), dummyRow.join(','), ...rows.map(r => r.join(','))].join('\r\n');
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
        'companyKey', 'employeeId', 'lastName', 'firstName', 'officeId',
        'targetYear', 'targetMonth',
        'bonusType', 'bonusName', 'bonus', 'bonusTotal', 'remarks',
        'commuteAllowance', 'commuteAllowancePeriodFrom', 'commuteAllowancePeriodTo', 'commuteAllowanceMonths'
      ];
      const rows = targetEmployees.map(emp => [
        emp.companyKey || this.companyKey,
        emp.employeeId || '',
        emp.lastName || '',
        emp.firstName || '',
        emp.officeId || '',
        this.csvYear,
        this.csvMonth,
        '', '', '', '', '', '', '', '', '', '' // 空欄（入力用）
      ]);
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
        remarks: salary.remarks || '',
        commuteAllowancePeriodFrom: salary.commuteAllowancePeriodFrom || '',
        commuteAllowancePeriodTo: salary.commuteAllowancePeriodTo || '',
        commuteAllowanceMonths: salary.commuteAllowanceMonths || 1,
        promotion: salary.promotion || 'noChange',
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
      const b = bonusList[0];
      this.bonus = {
        bonusType: b.bonusType,
        bonusName: b.bonusName,
        bonus: b.bonus,
        paymentDate: b.paymentDate || ''
      };
      this.bonusRemark = b.remarks || '';
    }
  }

  async onEditSave() {
    const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
    if (this.editMode === 'salary' && this.selectedEmployeeObj) {
      // otherAllowances配列は「その他手当」のみ格納
      const otherAllowances = [];
      if (this.salaryForm.otherAllowance) {
        otherAllowances.push({
          otherAllowanceName: 'その他手当',
          otherAllowance: Number(this.salaryForm.otherAllowance) || 0
        });
      }
      const totalAllowance = (Number(this.salaryForm.commuteAllowance) || 0) + (Number(this.salaryForm.positionAllowance) || 0) + (Number(this.salaryForm.otherAllowance) || 0);
      const totalSalary = (Number(this.salaryForm.basicSalary) || 0) + (Number(this.salaryForm.overtimeSalary) || 0) + totalAllowance;
      const salary = {
        companyKey: this.companyKey,
        employeeId: this.selectedEmployeeObj.employeeId,
        targetYearMonth: ym,
        paymentDate: this.salaryForm.paymentDate || '',
        basicSalary: Number(this.salaryForm.basicSalary) || 0,
        overtimeSalary: Number(this.salaryForm.overtimeSalary) || 0,
        commuteAllowance: Number(this.salaryForm.commuteAllowance) || 0,
        positionAllowance: Number(this.salaryForm.positionAllowance) || 0,
        otherAllowance: Number(this.salaryForm.otherAllowance) || 0,
        otherAllowances: otherAllowances,
        totalAllowance,
        totalSalary,
        remarks: this.salaryForm.remarks || '',
        commuteAllowancePeriodFrom: this.salaryForm.commuteAllowancePeriodFrom || '',
        commuteAllowancePeriodTo: this.salaryForm.commuteAllowancePeriodTo || '',
        commuteAllowanceMonths: this.salaryForm.commuteAllowanceMonths || 1,
        promotion: this.salaryForm.promotion || 'noChange',
        createdAt: this.salaryData?.createdAt ? this.salaryData.createdAt : new Date(),
        updatedAt: new Date(),
      };
      await this.firestoreService.updateSalary(salary.companyKey!, salary.employeeId, salary.targetYearMonth, salary);
      alert('給与情報を更新しました');
      this.editMode = null;
      this.editTarget = null;
      this.onClear();
    } else if (this.editMode === 'bonus' && this.selectedEmployeeObj) {
      const bonusData = {
        companyKey: this.companyKey,
        employeeId: this.selectedEmployeeObj.employeeId,
        targetYearMonth: ym,
        paymentDate: this.bonus.paymentDate || '',
        bonusType: this.bonus.bonusType || '',
        bonusName: this.bonus.bonusType === 'その他賞与' ? this.bonus.bonusName : '',
        bonus: Number(this.bonus.bonus) || 0,
        bonusTotal: this.bonusTotal,
        remarks: this.bonusRemark || '',
      };
      await this.firestoreService.updateBonus(bonusData.companyKey!, bonusData.employeeId, bonusData.targetYearMonth, bonusData as any);
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

  getInitialSalaryForm(): Partial<Salary> {
    return {
      paymentDate: '',
      promotion: 'noChange', // デフォルトは「変更なし」
      basicSalary: 0,
      overtimeSalary: 0,
      commuteAllowance: 0,
      positionAllowance: 0,
      otherAllowance: 0,
      remarks: '',
      totalAllowance: 0,
      totalSalary: 0,
      totalActualExpense: 0,
      totalOtherAllowance: 0,
      totalInKind: 0,
      totalRetro: 0,
      commuteAllowancePeriodFrom: '',
      commuteAllowancePeriodTo: '',
      commuteAllowanceMonths: 1,
    };
  }
}

