import { Component } from '@angular/core';
import { Router ,RouterModule} from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company } from '../../../../core/models/company.model';
import { collection, query, where, getDocs, addDoc, doc, setDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css'
})
export class EmployeeListComponent {
  company: Company | null = null;
  employees: any[] = [];
  today: string = new Date().toISOString().slice(0, 10);
  searchText: string = '';
  sortKey: string = 'employeeId';
  sortAsc: boolean = true;
  selectedOffice: string = '';
  selectedDepartment: string = '';

  constructor(
    private userCompanyService: UserCompanyService,
    private firestore: Firestore
  ) {
    this.userCompanyService.company$.subscribe(async (company: Company | null) => {
      this.company = company;
      if (company?.companyKey) {
        await this.loadEmployees(company.companyKey);
      }
    });
  }

  async loadEmployees(companyKey: string) {
    const employeesCol = collection(this.firestore, 'employees');
    const q = query(employeesCol, where('companyKey', '==', companyKey));
    const snap = await getDocs(q);
    this.employees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  showDetail(employee: any) {
    alert(`${employee.lastName} ${employee.firstName} の詳細ページへ`);
  }

  onAddEmployee() {
    alert('従業員追加ダイアログを開く想定です');
  }

  get officeList() {
    return Array.from(new Set(this.employees.map(e => e.officeName).filter(Boolean)));
  }

  get departmentList() {
    return Array.from(new Set(this.employees.map(e => e.department).filter(Boolean)));
  }

  get filteredEmployees() {
    let list = this.employees;
    if (this.selectedOffice) {
      list = list.filter(emp => emp.officeName === this.selectedOffice);
    }
    if (this.selectedDepartment) {
      list = list.filter(emp => emp.department === this.selectedDepartment);
    }
    if (this.searchText) {
      const keyword = this.searchText.toLowerCase();
      list = list.filter(emp =>
        (emp.employeeId && emp.employeeId.toLowerCase().includes(keyword)) ||
        (emp.lastName && emp.lastName.toLowerCase().includes(keyword)) ||
        (emp.firstName && emp.firstName.toLowerCase().includes(keyword)) ||
        (emp.officeName && emp.officeName.toLowerCase().includes(keyword)) ||
        (emp.department && emp.department.toLowerCase().includes(keyword))
      );
    }
    // ソート
    list = [...list].sort((a, b) => {
      const aVal = (a[this.sortKey] || '').toString().toLowerCase();
      const bVal = (b[this.sortKey] || '').toString().toLowerCase();
      if (aVal < bVal) return this.sortAsc ? -1 : 1;
      if (aVal > bVal) return this.sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }

  changeSort(key: string) {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = true;
    }
  }
}
