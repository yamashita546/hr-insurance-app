import { Component } from '@angular/core';
import { Router ,RouterModule} from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company } from '../../../../core/models/company.model';
import { collection, query, where, getDocs } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css'
})
export class EmployeeListComponent {
  company: Company | null = null;
  employees: any[] = [];

  constructor(
    private userCompanyService: UserCompanyService,
    private firestore: Firestore
  ) {
    this.userCompanyService.company$.subscribe(async (company: Company | null) => {
      this.company = company;
      if (company?.companyId) {
        await this.loadEmployees(company.companyId);
      }
    });
  }

  async loadEmployees(companyId: string) {
    const employeesCol = collection(this.firestore, 'employees');
    const q = query(employeesCol, where('companyId', '==', companyId));
    const snap = await getDocs(q);
    this.employees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  showDetail(employee: any) {
    // 詳細表示処理（ダミー）
    alert(`${employee.lastName} ${employee.firstName} の詳細ページへ`);
  }

  onAddEmployee() {
    // 従業員追加処理（ダミー）
    alert('従業員追加ダイアログを開く想定です');
  }
}
