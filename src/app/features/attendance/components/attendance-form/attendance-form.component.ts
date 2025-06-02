import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Employee } from '../../../../core/models/employee.model';
import { Attendance, ATTENDANCE_COLUMN_ORDER, ATTENDANCE_COLUMN_LABELS } from '../../../../core/models/attendance.model';
import { Office } from '../../../../core/models/company.model';
import { firstValueFrom, Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-attendance-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './attendance-form.component.html',
  styleUrl: './attendance-form.component.css'
})
export class AttendanceFormComponent implements OnInit, OnDestroy {
  @Output() formSaved = new EventEmitter<void>();
  @Output() formCancel = new EventEmitter<void>();

  form!: FormGroup;
  employees: Employee[] = [];
  offices: Office[] = [];
  filteredEmployees: { [officeId: string]: Employee[] } = {};
  companyKey: string = '';
  ATTENDANCE_COLUMN_ORDER = ATTENDANCE_COLUMN_ORDER;
  ATTENDANCE_COLUMN_LABELS = ATTENDANCE_COLUMN_LABELS;
  private companySub?: Subscription;
  fileName: string = '';
  pendingImportData: any[] = [];
  importErrors: string[] = [];
  showCsvDialog: boolean = false;
  csvYear: string = '';
  csvMonth: string = '';
  yearList: string[] = [];
  monthList: string[] = Array.from({length: 12}, (_, i) => String(i+1));
  csvOfficeId: string = '';

  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.companySub = this.userCompanyService.company$.subscribe(async company => {
      if (company && company.companyKey) {
        this.companyKey = company.companyKey;
        this.offices = await this.firestoreService.getOffices(company.companyKey);
        this.employees = await this.firestoreService.getEmployeesByCompanyKey(company.companyKey);
        this.filteredEmployees = {};
        this.offices.forEach(office => {
          this.filteredEmployees[office.id] = this.employees.filter(
            emp => emp.officeId === office.id
          );
        });
        this.generateYearList();
        if (this.attendances.length === 0) {
          for (let i = 0; i < 3; i++) this.addRow();
        }
      }
    });
  }

  ngOnDestroy() {
    this.companySub?.unsubscribe();
  }

  private initForm() {
    this.form = this.fb.group({
      attendances: this.fb.array([])
    });
    this.addRow();
  }

  get attendances(): FormArray<FormGroup> {
    return this.form.get('attendances') as FormArray<FormGroup>;
  }

  addRow() {
    this.attendances.push(this.fb.group({
      year: ['', Validators.required],
      month: ['', Validators.required],
      officeId: [''],
      officeName: [''],
      employeeId: [''],
      employeeName: [''],
      scheduledWorkDays: [''],
      actualWorkDays: [''],
      scheduledWorkHours: [''],
      actualWorkHours: [''],
      absentDays: [''],
      leaveWithoutPayDays: [''],
      paidLeaveDays: [''],
      childCareLeaveStartDate: [''],
      childCareLeaveEndDate: [''],
      familyCareLeaveStartDate: [''],
      familyCareLeaveEndDate: [''],
      injuryOrSicknessLeaveStartDate: [''],
      injuryOrSicknessLeaveEndDate: [''],
      isOnFullLeaveThisMonth: [false],
      companyKey: [this.companyKey]
    }));
  }

  removeRow(i: number) {
    this.attendances.removeAt(i);
  }

  onOfficeChange(index: number) {
    const group = this.attendances.at(index);
    const officeId = group.get('officeId')?.value;
    const office = this.offices.find(o => o.id === officeId);
    
    if (office) {
      group.patchValue({
        officeName: office.name,
        employeeId: '',
        employeeName: ''
      });
    }
  }

  onEmployeeChange(index: number) {
    const group = this.attendances.at(index);
    const employeeId = group.get('employeeId')?.value;
    const employee = this.employees.find(emp => emp.employeeId === employeeId);
    
    if (employee) {
      const office = this.offices.find(o => o.id === employee.officeId);
      group.patchValue({
        officeId: employee.officeId,
        officeName: office?.name || '',
        employeeName: this.getEmployeeFullName(employee)
      });
    }
  }

  onEmployeeNameChange(index: number) {
    const group = this.attendances.at(index);
    const employeeName = group.get('employeeName')?.value;
    const employee = this.employees.find(emp => (emp.lastName + emp.firstName) === employeeName);

    if (employee) {
      const office = this.offices.find(o => o.id === employee.officeId);
      group.patchValue({
        officeId: employee.officeId,
        officeName: office?.name || '',
        employeeId: employee.employeeId
      });
    }
  }

  getOfficeEmployees(officeId: string): Employee[] {
    return this.filteredEmployees[officeId] || [];
  }

  async onSubmit() {
    if (this.form.invalid) return;
    for (const group of this.attendances.controls) {
      const data = { ...group.value, companyKey: this.companyKey };
      await this.firestoreService.addAttendance(data);
    }
    alert('保存しました');
    this.form.reset();
    while (this.attendances.length > 0) this.attendances.removeAt(0);
    for (let i = 0; i < 3; i++) this.addRow();
    this.formSaved.emit();
  }

  onCancel() {
    this.formCancel.emit();
  }

  getEmployeeFullName(emp: Employee): string {
    return emp.lastName + emp.firstName;
  }

  generateYearList() {
    const current = new Date().getFullYear();
    this.yearList = [];
    for (let y = current - 1; y <= current + 2; y++) {
      this.yearList.push(String(y));
    }
  }

  onExportCsv() {
    this.showCsvDialog = true;
    this.csvYear = this.yearList.length ? this.yearList[0] : String(new Date().getFullYear());
    this.csvMonth = '1';
  }

  onCsvDialogCancel() {
    this.showCsvDialog = false;
  }

  async onCsvDialogExport() {
    // Attendanceモデルの全カラム
    const header = [
      'year', 'month', 'officeName', 'employeeId', 'employeeName',
      'scheduledWorkDays', 'actualWorkDays', 'scheduledWorkHours', 'actualWorkHours',
      'absentDays', 'leaveWithoutPayDays', 'paidLeaveDays',
      'childCareLeaveStartDate', 'childCareLeaveEndDate',
      'familyCareLeaveStartDate', 'familyCareLeaveEndDate',
      'injuryOrSicknessLeaveStartDate', 'injuryOrSicknessLeaveEndDate',
      'isOnFullLeaveThisMonth', 'companyKey'
    ];
    // 各従業員ごとに1行生成
    const filteredEmployees = this.csvOfficeId
      ? this.employees.filter(emp => emp.officeId === this.csvOfficeId)
      : this.employees;
    const rows: Record<string, any>[] = filteredEmployees.map(emp => {
      const row: Record<string, any> = {};
      header.forEach(h => row[h] = '');
      row['companyKey'] = emp.companyKey;
      row['employeeId'] = emp.employeeId;
      row['employeeName'] = emp.lastName + ' ' + emp.firstName;
      row['officeName'] = emp.officeName || '';
      row['year'] = this.csvYear;
      row['month'] = this.csvMonth;
      return row;
    });
    const csv = [header.join(','), ...rows.map(r => header.map(h => r[h]).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_template_${this.csvYear}_${this.csvMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.showCsvDialog = false;
  }

  onImportCsv(event: any) {
    const file = event.target.files[0];
    this.fileName = file ? file.name : '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      const { data, errors } = this.parseCsv(text);
      this.pendingImportData = data;
      this.importErrors = errors;
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
      if (!row['year'] || !row['month']) {
        errors.push(`${i+1}行目: 年度または月が未入力です`);
        continue;
      }
      data.push(row);
    }
    return { data, errors };
  }

  async confirmImport() {
    if (this.importErrors.length > 0) {
      alert('エラーがあります。修正してください。');
      return;
    }
    for (const att of this.pendingImportData) {
      await this.firestoreService.addAttendance(att);
    }
    alert('インポートが完了しました');
    this.pendingImportData = [];
    this.fileName = '';
  }

  cancelImport() {
    this.pendingImportData = [];
    this.importErrors = [];
    this.fileName = '';
  }
}
