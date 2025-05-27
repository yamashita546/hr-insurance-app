import { Component } from '@angular/core';
import { Router ,RouterModule} from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company } from '../../../../core/models/company.model';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css'
})
export class EmployeeListComponent {
  company: Company | null = null;

  constructor(private userCompanyService: UserCompanyService) {
    this.userCompanyService.company$.subscribe((company: Company | null) => {
      this.company = company;
    });
  }

  employees = [
    { employeeId: 'E001', officeName: '大阪営業所', department: '営業部', lastName: '山田', firstName: '太郎' },
    { employeeId: 'E002', officeName: '東京本社', department: '総務部', lastName: '佐藤', firstName: '花子' },
  ];

  showDetail(employee: any) {
    // 詳細表示処理（ダミー）
    alert(`${employee.lastName} ${employee.firstName} の詳細ページへ`);
  }

  onAddEmployee() {
    // 従業員追加処理（ダミー）
    alert('従業員追加ダイアログを開く想定です');
  }
}
