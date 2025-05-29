import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

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

  employees = [
    { name: '山田 太郎', branch: '本社', baseSalary: 250000, overtime: 58000, allowance: 252000, totalSalary: 310000, bonus: 0, status: '登録済' },
    { name: '鈴木 花子', branch: '東京支社', baseSalary: 280000, overtime: 65000, allowance: 265000, totalSalary: 330000, bonus: 200000, status: '賞与あり' }
  ];

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

  constructor() {
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

  onSearch() {
    // 検索ボタン押下時の追加処理があればここに
  }

  sortBy(key: keyof typeof this.employees[0]) {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = true;
    }
  }
  onRegisterSalary(employee: any) {
    // 登録・編集ボタン押下時の処理があればここに
  }
}
