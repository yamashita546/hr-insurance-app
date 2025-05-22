import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InsuranceRate } from '../../../../core/models/insurance-rate.model';
import { DateTimestampPipe } from '../../../../core/pipe/date-timestamp.pipe';


interface Prefecture {
  code: string;
  name: string;
}

@Component({
  selector: 'app-insurance-rate',
  standalone: true,
  imports: [FormsModule, DateTimestampPipe],
  templateUrl: './insurance-rate.component.html',
  styleUrl: './insurance-rate.component.css'
})
export class InsuranceRateComponent {
  years: number[] = [2024, 2023, 2022]; // サンプル年度
  prefectures: Prefecture[] = [
    { code: '13', name: '東京都' },
    { code: '27', name: '大阪府' },
    { code: '01', name: '北海道' },
    // ...他の都道府県も追加
  ];
  selectedYear: number = this.years[0];
  selectedPrefecture: string = '';
  rates: InsuranceRate[] = [];
  filteredRates: InsuranceRate[] = [];
  selectedRate: InsuranceRate | null = null;

  constructor() {
    // 仮データ
    this.rates = [
      {
        id: '1',
        prefectureCode: '13',
        prefectureName: '東京都',
        validFrom: new Date('2024-03-01'),
        validTo: new Date('2025-02-28'),
        healthInsuranceRate: 9.84,
        employerShare: 4.92,
        employeeShare: 4.92,
        careInsuranceRate: 1.60,
        updatedAt: new Date(),
      },
      // ...他のサンプルデータ
    ];
    this.applyFilter();
  }

  onYearChange(event: any) {
    this.applyFilter();
  }

  onPrefectureChange(event: any) {
    this.applyFilter();
  }

  applyFilter() {
    this.filteredRates = this.rates.filter(rate => {
      const yearMatch = !this.selectedYear || (rate.validFrom.getFullYear() === this.selectedYear);
      const prefMatch = !this.selectedPrefecture || (rate.prefectureCode === this.selectedPrefecture);
      return yearMatch && prefMatch;
    });
    this.selectedRate = null;
  }

  selectRate(rate: InsuranceRate) {
    this.selectedRate = rate;
  }

  onAdd() {
    // 追加ダイアログ表示処理
  }

  onEdit(rate?: InsuranceRate) {
    // 編集ダイアログ表示処理
  }

  onDelete() {
    // 削除処理
  }

  onExportCsv() {
    // CSVひな型出力処理
  }

  onImportCsv(event: any) {
    // CSV取込処理
  }
}
