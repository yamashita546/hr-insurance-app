import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InsuranceRate } from '../../../../core/models/insurance-rate.model';
import { DateTimestampPipe } from '../../../../core/pipe/date-timestamp.pipe';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { MatDialog } from '@angular/material/dialog';
import { AddInsuranceRateComponent } from '../../dialogs/add-insurance-rate/add-insurance-rate.component';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { CommonModule } from '@angular/common';
import { toDate } from '../../../../core/utils/date-util';
import { Validators } from '@angular/forms';
import { EditInsuranceRateComponent } from '../../dialogs/edit-insurance-rate/edit-insurance-rate.component';

interface Prefecture {
  code: string;
  name: string;
}

@Component({
  selector: 'app-insurance-rate',
  standalone: true,
  imports: [FormsModule, DateTimestampPipe, CommonModule],
  templateUrl: './insurance-rate.component.html',
  styleUrl: './insurance-rate.component.css'
})
export class InsuranceRateComponent {
  years: number[] = []; // Firestoreデータから自動生成
  prefectures: Prefecture[] = PREFECTURES;
  selectedYear: number = 0; // データ取得後にセット
  selectedPrefecture: string = '';
  rates: InsuranceRate[] = [];
  originalRates: InsuranceRate[] = [];
  filteredRates: InsuranceRate[] = [];
  selectedRate: InsuranceRate | null = null;

  constructor(private dialog: MatDialog, private firestore: FirestoreService) {
    this.firestore.getInsuranceRates().subscribe(rates => {
      this.rates = rates.map(r => ({ ...r }));
      this.originalRates = rates.map(r => ({ ...r }));
      // 年度リストを自動生成
      const yearSet = new Set(rates.map(rate => rate.validFrom?.substr(0, 4)).filter(y => !!y));
      this.years = Array.from(yearSet).map(Number).sort((a, b) => b - a);
      // デフォルト選択も最新年度に
      this.selectedYear = this.years[0];
      this.applyFilter();
    });
  }

  onYearChange(event: any) {
    this.applyFilter();
  }

  onPrefectureChange(event: any) {
    this.applyFilter();
  }

  applyFilter() {
    this.filteredRates = this.rates.filter(rate => {
      const yearMatch = !this.selectedYear || (rate.validFrom && rate.validFrom.substr(0, 4) === String(this.selectedYear));
      const prefMatch = !this.selectedPrefecture || (rate.prefectureCode === this.selectedPrefecture);
      return yearMatch && prefMatch;
    });
    console.log('applyFilter後のfilteredRates:', this.filteredRates);
    this.selectedRate = null;
  }

  selectRate(rate: InsuranceRate) {
    this.selectedRate = rate;
  }

  sortByPrefectureName() {
    this.filteredRates.sort((a, b) => {
      const nameA = PREFECTURES.find(p => p.code === a.prefectureCode)?.name || '';
      const nameB = PREFECTURES.find(p => p.code === b.prefectureCode)?.name || '';
      return nameA.localeCompare(nameB, 'ja');
    });
  }

  onAdd() {
    const dialogRef = this.dialog.open(AddInsuranceRateComponent, {
      width: '400px',
      height: '400px',
      disableClose: true
    });
    dialogRef.componentInstance.added.subscribe(() => {
      dialogRef.close();
      this.firestore.getInsuranceRates().subscribe(rates => {
        this.rates = rates;
        this.applyFilter();
      });
    });
  }

  onEdit(rate?: InsuranceRate) {
    if (!rate) return;
    const dialogRef = this.dialog.open(EditInsuranceRateComponent, {
      width: '480px',
      height: '400px',
      data: { ...rate }
    });
    const instance = dialogRef.componentInstance;
    if (instance) {
      instance.data = { ...rate };
      instance.saved.subscribe((updated: InsuranceRate) => {
        // ローカルrates配列を更新
        const idx = this.rates.findIndex(r => r.id === updated.id);
        if (idx !== -1) {
          this.rates[idx] = { ...updated };
          this.applyFilter();
        }
        dialogRef.close();
      });
      instance.cancelled.subscribe(() => {
        dialogRef.close();
      });
    }
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

  isCellChanged(rate: InsuranceRate, field: keyof InsuranceRate): boolean {
    const original = this.originalRates.find(r => r.id === rate.id);
    if (!original) return false;
    // null/undefined/数値/文字列の厳密比較
    const current = rate[field];
    const orig = original[field];
    if (current == null && orig == null) return false;
    if (typeof current === 'number' && typeof orig === 'number') {
      return current !== orig;
    }
    return current !== orig;
  }

  applyChanges() {
    // 差分のみ抽出
    const updatedRates = this.rates.filter(rate => {
      const original = this.originalRates.find(r =>
        r.prefectureCode === rate.prefectureCode && r.validFrom === rate.validFrom
      );
      return !original || Object.keys(rate).some(key => rate[key as keyof InsuranceRate] !== original[key as keyof InsuranceRate]);
    });
    if (updatedRates.length === 0) {
      alert('変更はありません');
      return;
    }
    // Firestoreへの更新処理
    Promise.all(updatedRates.map(rate => {
      const docId = `${rate.prefectureCode}_${rate.validFrom}`;
      return this.firestore.addOrUpdateInsuranceRateById(docId, rate);
    })).then(() => {
      alert('変更を適用しました');
      // Firestoreから再取得してローカルを最新化
      this.firestore.getInsuranceRates().subscribe(rates => {
        this.rates = rates.map(r => ({ ...r }));
        this.originalRates = rates.map(r => ({ ...r }));
        this.applyFilter();
      });
    }).catch(err => {
      alert('更新に失敗しました: ' + err);
    });
  }
}
