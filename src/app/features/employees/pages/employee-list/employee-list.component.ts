import { Component } from '@angular/core';
import { Router ,RouterModule} from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company } from '../../../../core/models/company.model';
import { collection, query, where, getDocs, addDoc, doc, setDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { EMPLOYEE_TYPES } from '../../../../core/models/employee.type';

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
  selectedEmploymentType: string = '';
  offices: any[] = [];
  departments: any[] = [];

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
    // 事業所・部署もFirestoreから取得
    const officesCol = collection(this.firestore, 'offices');
    const officesSnap = await getDocs(query(officesCol, where('companyKey', '==', companyKey)));
    this.offices = officesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const departmentsCol = collection(this.firestore, 'departments');
    const departmentsSnap = await getDocs(query(departmentsCol, where('companyKey', '==', companyKey)));
    this.departments = departmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  showDetail(employee: any) {
    alert(`${employee.lastName} ${employee.firstName} の詳細ページへ`);
  }

  onAddEmployee() {
    if (this.activeOfficeList.length === 0) {
      alert('有効な事業所情報が登録されてません。\n会社情報設定より事業所を登録してください。');
      return;
    }
    alert('従業員追加ダイアログを開く想定です');
  }

  get activeOfficeList() {
    return this.offices.filter(o => o.isActive !== false).map(o => o.name);
  }
  get activeDepartmentList() {
    return this.departments.filter(d => d.isActive !== false).map(d => d.name);
  }
  get employmentTypeNameList() {
    return EMPLOYEE_TYPES.map(t => t.name);
  }
  get officeList() {
    return this.activeOfficeList;
  }
  get departmentList() {
    return this.activeDepartmentList;
  }
  get employmentTypeList() {
    return this.employmentTypeNameList;
  }

  get filteredEmployees() {
    let list = this.employees.filter(emp => emp.isActive !== false);
    if (this.selectedOffice) {
      list = list.filter(emp => emp.officeName === this.selectedOffice);
    }
    if (this.selectedDepartment) {
      list = list.filter(emp => emp.department === this.selectedDepartment);
    }
    if (this.selectedEmploymentType) {
      list = list.filter(emp => emp.employeeType === this.selectedEmploymentType);
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
    // 雇用形態をnameに変換
    return list.map(emp => ({ ...emp, employeeType: this.getEmployeeTypeName(emp.employeeType) }));
  }

  changeSort(key: string) {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
      } else {
      this.sortKey = key;
      this.sortAsc = true;
    }
  }

  getEmployeeTypeName(code: string): string {
    const type = EMPLOYEE_TYPES.find(t => t.code === code);
    return type ? type.name : code || '';
  }
}
