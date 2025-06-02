import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company } from '../../../../core/models/company.model';
import { collection, query, where, getDocs, addDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
import { Attendance } from '../../../../core/models/attendance.model';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { ATTENDANCE_COLUMN_LABELS, ATTENDANCE_COLUMN_ORDER } from '../../../../core/models/attendance.model';
import { AttendanceFormComponent } from '../../components/attendance-form/attendance-form.component';
import { RouterModule } from '@angular/router';
import { Employee } from '../../../../core/models/employee.model';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AttendanceFormComponent, RouterModule],
  templateUrl: './attendance-list.component.html',
  styleUrl: './attendance-list.component.css',
  providers: [DatePipe]
})
export class AttendanceListComponent {
  company: Company | null = null;
  attendances: any[] = [];
  sortKey: string = 'year';
  sortOrder: 'asc' | 'desc' = 'desc';
  offices: any[] = [];
  selectedYear: string = '';
  selectedMonth: string = '';
  selectedOfficeId: string = '';
  yearList: string[] = [];
  monthList: string[] = Array.from({length: 12}, (_, i) => String(i+1));
  employeeType: string[] = [];
  searchText: string = '';
  selectedEmployeeType: string = '';
  employees: any[] = [];
  alertTargets: any[] = [];

  constructor(
    private userCompanyService: UserCompanyService,
    private firestore: Firestore,
    private firestoreService: FirestoreService
  ) {
    this.userCompanyService.company$.subscribe(async (company: Company | null) => {
      this.company = company;
      if (company?.companyKey) {
        await this.loadAttendances(company.companyKey);
        await this.loadOffices(company.companyKey);
        this.generateYearList();
      }
    });
  }

  async loadAttendances(companyKey: string) {
    const attendancesCol = collection(this.firestore, 'attendances');
    const q = query(attendancesCol, where('companyKey', '==', companyKey));
    const snap = await getDocs(q);
    const attendances = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    this.employees = await this.firestoreService.getEmployeesByCompanyKey(companyKey);
    this.attendances = attendances.map(att => {
      const attAny = att as any;
      const emp = this.employees.find(e => e.employeeId === String(attAny.employeeId ?? ''));
      return { ...att, employeeType: emp?.employeeType || '' };
    });
    this.extractAlertTargets();
    this.sortAttendances();
  }

  async loadOffices(companyKey: string) {
    this.offices = await this.firestoreService.getOffices(companyKey);
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
    // Implementation of onAddAttendance method
  }

  // テンプレートで使うためにエクスポート
  ATTENDANCE_COLUMN_LABELS = ATTENDANCE_COLUMN_LABELS;
  ATTENDANCE_COLUMN_ORDER = ATTENDANCE_COLUMN_ORDER;
  ATTENDANCE_COLUMN_ORDER_DISPLAY = ATTENDANCE_COLUMN_ORDER.filter(col => col !== 'companyKey');

  get employeeTypeList() {
    return Array.from(new Set(this.attendances.map(a => a.employeeType).filter(Boolean)));
  }

  get filteredAttendances() {
    let list = this.attendances;
    if (this.selectedYear) {
      list = list.filter(a => a.year === this.selectedYear);
    }
    if (this.selectedMonth) {
      list = list.filter(a => a.month === this.selectedMonth);
    }
    if (this.selectedOfficeId) {
      list = list.filter(a => a.officeId === this.selectedOfficeId);
    }
    if (this.selectedEmployeeType) {
      list = list.filter(a => a.employeeType === this.selectedEmployeeType);
    }
    if (this.searchText) {
      const keyword = this.searchText.toLowerCase();
      list = list.filter(a =>
        (a.employeeId && String(a.employeeId).toLowerCase().includes(keyword)) ||
        (a.employeeName && a.employeeName.toLowerCase().includes(keyword)) ||
        (a.officeName && a.officeName.toLowerCase().includes(keyword))
      );
    }
    // 最新の1件だけ残す
    const latestMap = new Map();
    list.forEach(a => {
      const key = String(a.employeeId);
      const y = Number(a.year);
      const m = Number(a.month);
      if (!latestMap.has(key)) {
        latestMap.set(key, a);
      } else {
        const prev = latestMap.get(key);
        const prevY = Number(prev.year);
        const prevM = Number(prev.month);
        if (y > prevY || (y === prevY && m > prevM)) {
          latestMap.set(key, a);
        }
      }
    });
    list = Array.from(latestMap.values());
    // ソート
    list = [...list].sort((a, b) => {
      const aVal = (a[this.sortKey] || '').toString().toLowerCase();
      const bVal = (b[this.sortKey] || '').toString().toLowerCase();
      if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }

  changeSort(key: string) {
    if (this.sortKey === key) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortOrder = 'asc';
    }
  }

  extractAlertTargets() {
    // 社会保険未加入かつパート・アルバイトで週20時間以上勤務
    // 週20時間 = 月約87時間（20×52÷12）
    const thresholdHours = 87;
    // 最新の1件だけ残す
    const latestMap = new Map();
    this.attendances.forEach(a => {
      const key = String(a.employeeId);
      const y = Number(a.year);
      const m = Number(a.month);
      if (!latestMap.has(key)) {
        latestMap.set(key, a);
      } else {
        const prev = latestMap.get(key);
        const prevY = Number(prev.year);
        const prevM = Number(prev.month);
        if (y > prevY || (y === prevY && m > prevM)) {
          latestMap.set(key, a);
        }
      }
    });
    const latestList = Array.from(latestMap.values());
    this.alertTargets = latestList.filter(att => {
      const emp = this.employees.find(e => e.employeeId === String((att as any).employeeId ?? ''));
      if (!emp) return false;
      const type = (emp.employeeType || '').toLowerCase();
      const isPartOrBaito = type.includes('パート') || type.includes('ｱﾙﾊﾞｲﾄ') || type.includes('アルバイト');
      const isNotJoined = !emp.isHealthInsuranceApplicable && !emp.isPensionApplicable;
      const enoughHours = Number(att.actualWorkHours) >= thresholdHours;
      return isPartOrBaito && isNotJoined && enoughHours;
    }).map(att => {
      const emp = this.employees.find(e => e.employeeId === String((att as any).employeeId ?? ''));
      return {
        employeeName: att.employeeName,
        officeName: att.officeName,
        employeeType: emp?.employeeType,
        actualWorkHours: att.actualWorkHours,
        actualWorkDays: att.actualWorkDays,
        employeeId: att.employeeId
      };
    });
  }
}
