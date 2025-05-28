import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company } from '../../../../core/models/company.model';
import { collection, query, where, getDocs, addDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
import { Attendance } from '../../../../core/models/attendance.model';
import { FirestoreService } from '../../../../core/services/firestore.service';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-list.component.html',
  styleUrl: './attendance-list.component.css',
  providers: [DatePipe]
})
export class AttendanceListComponent {
  company: Company | null = null;
  attendances: any[] = [];
  fileName: string = '';
  pendingImportData: any[] = [];
  importErrors: string[] = [];
  sortKey: string = 'year';
  sortOrder: 'asc' | 'desc' = 'desc';
  offices: any[] = [];
  selectedYear: string = '';
  selectedMonth: string = '';
  selectedOfficeId: string = '';
  yearList: string[] = [];
  monthList: string[] = Array.from({length: 12}, (_, i) => String(i+1));
  showCsvDialog: boolean = false;
  csvYear: string = '';
  csvMonth: string = '';
  employees: any[] = [];

  constructor(
    private userCompanyService: UserCompanyService,
    private firestore: Firestore,
    private firestoreService: FirestoreService
  ) {
    this.userCompanyService.company$.subscribe(async (company: Company | null) => {
      this.company = company;
      if (company?.companyId) {
        await this.loadAttendances(company.companyId);
        await this.loadOffices(company.companyId);
        this.generateYearList();
      }
    });
  }

  async loadAttendances(companyId: string) {
    const attendancesCol = collection(this.firestore, 'attendances');
    const q = query(attendancesCol, where('companyId', '==', companyId));
    const snap = await getDocs(q);
    this.attendances = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    this.sortAttendances();
  }

  async loadOffices(companyId: string) {
    this.offices = await this.firestoreService.getOffices(companyId);
  }

  generateYearList() {
    const years = this.attendances.map(a => Number(a.year));
    const current = new Date().getFullYear();
    const min = Math.min(...years, current);
    const max = Math.max(...years, current + 2);
    this.yearList = [];
    for (let y = min; y <= max; y++) {
      this.yearList.push(String(y));
    }
  }

  onSortChange() {
    this.sortAttendances();
  }

  sortAttendances() {
    let filtered = this.attendances;
    if (this.selectedYear) filtered = filtered.filter(a => a.year === this.selectedYear);
    if (this.selectedMonth) filtered = filtered.filter(a => a.month === this.selectedMonth);
    if (this.selectedOfficeId) filtered = filtered.filter(a => a.officeId === this.selectedOfficeId);
    filtered.sort((a, b) => {
      if (a[this.sortKey] === b[this.sortKey]) return 0;
      if (this.sortOrder === 'asc') {
        return a[this.sortKey] > b[this.sortKey] ? 1 : -1;
      } else {
        return a[this.sortKey] < b[this.sortKey] ? 1 : -1;
      }
    });
    this.attendances = filtered;
  }

  onAddAttendance() {
    alert('勤怠情報追加ダイアログを開く想定です');
  }

  async onExportCsv() {
    this.showCsvDialog = true;
    this.csvYear = this.selectedYear || (this.yearList.length ? this.yearList[0] : String(new Date().getFullYear()));
    this.csvMonth = this.selectedMonth || '1';
    if (this.company?.companyId) {
      this.employees = await this.firestoreService.getEmployeesByCompanyId(this.company.companyId);
    }
  }

  onCsvDialogCancel() {
    this.showCsvDialog = false;
  }

  onCsvDialogExport() {
    // Attendanceモデルの全カラム
    const header = [
      'year', 'month', 'officeName', 'employeeId', 'employeeName',
      'scheduledWorkDays', 'actualWorkDays', 'scheduledWorkHours', 'actualWorkHours',
      'absentDays', 'leaveWithoutPayDays', 'paidLeaveDays',
      'childCareLeaveStartDate', 'childCareLeaveEndDate',
      'familyCareLeaveStartDate', 'familyCareLeaveEndDate',
      'injuryOrSicknessLeaveStartDate', 'injuryOrSicknessLeaveEndDate',
      'isOnFullLeaveThisMonth', 'companyId'
    ];
    // 各従業員ごとに1行生成
    const rows: Record<string, any>[] = this.employees.map(emp => {
      const row: Record<string, any> = {};
      header.forEach(h => row[h] = '');
      row['companyId'] = emp.companyId;
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
      await addDoc(collection(this.firestore, 'attendances'), att);
    }
    alert('インポートが完了しました');
    this.pendingImportData = [];
    this.fileName = '';
    await this.loadAttendances(this.company?.companyId || '');
  }

  cancelImport() {
    this.pendingImportData = [];
    this.importErrors = [];
    this.fileName = '';
  }
}
