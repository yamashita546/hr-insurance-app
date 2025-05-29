import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manage-standard-monthly',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-standard-monthly.component.html',
  styleUrl: './manage-standard-monthly.component.css'
})
export class ManageStandardMonthlyComponent {
  standardMonthlyList = [
    {
      name: '山田 太郎',
      currentGrade: '17等級',
      currentMonthly: 230000,
      currentStartDate: '2023/09/01',
      nextGrade: '19等級',
      nextMonthly: 280000,
      nextStartDate: '2024/09/01',
      status: 'change',
    },
    {
      name: '鈴木 花子',
      currentGrade: '14等級',
      currentMonthly: 190000,
      currentStartDate: '2023/09/01',
      nextGrade: '14等級',
      nextMonthly: 190000,
      nextStartDate: '2024/09/01',
      status: 'nochange',
    },
  ];

  onRevision(row: any) {
    alert(`「${row.name}」の随時改定ボタンがクリックされました。`);
  }
}
