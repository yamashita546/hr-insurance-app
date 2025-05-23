import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InsuranceRate } from '../../../../core/models/insurance-rate.model';
import { DateTimestampPipe } from '../../../../core/pipe/date-timestamp.pipe';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddInsuranceRateComponent } from '../../dialogs/add-insurance-rate/add-insurance-rate.component';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { CommonModule } from '@angular/common';
import { toDate } from '../../../../core/utils/date-util';
import { Validators } from '@angular/forms';
import { EditInsuranceRateComponent } from '../../dialogs/edit-insurance-rate/edit-insurance-rate.component';
import { INSURANCE_TYPES } from '../../../../core/models/insurance-type';

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
  insuranceTypes = INSURANCE_TYPES;
  selectedInsuranceType: string = '';
  fileName: string = '';
  dialogRef: MatDialogRef<any> | null = null;

  constructor(private dialog: MatDialog, private firestore: FirestoreService) {
    // localStorageから前回の選択値を取得
    const savedYear = localStorage.getItem('insuranceRateSelectedYear');
    const savedPref = localStorage.getItem('insuranceRateSelectedPrefecture');
    this.selectedYear = savedYear ? Number(savedYear) : 0;
    this.selectedPrefecture = savedPref || '';

    this.firestore.getInsuranceRates().subscribe(rates => {
      this.rates = rates.map(r => ({ ...r }));
      this.originalRates = rates.map(r => ({ ...r }));
      // 年度リストをデータベースにある年度＋未来3年分で生成
      const currentYear = new Date().getFullYear();
      const dbYears = rates.map(rate => Number(rate.validFrom?.substr(0, 4))).filter(y => !!y);
      const futureYears = [0, 1, 2].map(offset => currentYear + offset);
      const allYears = Array.from(new Set([...dbYears, ...futureYears])).sort((a, b) => b - a);
      this.years = allYears;
      this.applyFilter();
    });
  }

  onYearChange(event: any) {
    this.selectedYear = Number(this.selectedYear);
    localStorage.setItem('insuranceRateSelectedYear', String(this.selectedYear));
    this.applyFilter();
  }

  onPrefectureChange(event: any) {
    localStorage.setItem('insuranceRateSelectedPrefecture', this.selectedPrefecture);
    this.applyFilter();
  }

  onInsuranceTypeChange(event: any) {
    this.applyFilter();
  }

  applyFilter() {
    this.filteredRates = this.rates.filter(rate => {
      const yearMatch = !this.selectedYear || (rate.validFrom && rate.validFrom.substr(0, 4) === String(this.selectedYear));
      const prefMatch = !this.selectedPrefecture || (rate.prefectureCode === this.selectedPrefecture);
      const typeMatch = !this.selectedInsuranceType || (rate.insuranceType === this.selectedInsuranceType);
      return yearMatch && prefMatch && typeMatch;
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
    if (this.dialogRef) return; // 多重起動防止
    this.dialogRef = this.dialog.open(AddInsuranceRateComponent, {
      width: '400px',
      height: '400px',
      disableClose: true
    });
    this.dialogRef.componentInstance.added.subscribe(() => {
      this.dialogRef?.close();
      this.dialogRef = null;
      this.firestore.getInsuranceRates().subscribe(rates => {
        this.rates = rates;
        this.applyFilter();
      });
    });
    this.dialogRef.afterClosed().subscribe(() => {
      this.dialogRef = null;
    });
  }

  onEdit(rate?: InsuranceRate) {
    if (this.dialogRef) return; // 多重起動防止
    if (!rate) return;
    this.dialogRef = this.dialog.open(EditInsuranceRateComponent, {
      width: '480px',
      height: '400px',
      data: { ...rate }
    });
    const instance = this.dialogRef.componentInstance;
    if (instance) {
      instance.data = { ...rate };
      instance.saved.subscribe((updated: InsuranceRate) => {
        const idx = this.rates.findIndex(r => r.id === updated.id);
        if (idx !== -1) {
          this.rates[idx] = { ...updated };
          this.applyFilter();
        }
        this.dialogRef?.close();
        this.dialogRef = null;
      });
      instance.cancelled.subscribe(() => {
        this.dialogRef?.close();
        this.dialogRef = null;
      });
    }
    this.dialogRef.afterClosed().subscribe(() => {
      this.dialogRef = null;
    });
  }

  onDelete() {
    // 削除処理
  }

  onExportCsv() {
    // 現在のフィルタ条件を取得
    const insuranceTypeLabel = this.selectedInsuranceType ? (this.insuranceTypes.find(t => t.code === this.selectedInsuranceType)?.name || this.selectedInsuranceType) : '全保険種別';
    const yearLabel = this.selectedYear ? `${this.selectedYear}年度` : '全年度';
    const prefLabel = this.selectedPrefecture ? (this.prefectures.find(p => p.code === this.selectedPrefecture)?.name || this.selectedPrefecture) : '全都道府県';
    const msg = `現在表示されている「${insuranceTypeLabel}」「${yearLabel}」「${prefLabel}」をひな型としてCSV出力します。よろしいですか？`;
    if (!window.confirm(msg)) return;
    // CSVヘッダー（insuranceTypeを先頭に追加）
    const headers = [
      'insuranceType',
      'prefectureCode',
      'prefectureName',
      'validFrom',
      'validTo',
      'healthInsuranceBaseRate',
      'healthInsuranceSpecificRate',
      'healthInsuranceRate',
      'healthInsuranceShareRate',
      'careInsuranceRate',
      'careInsuranceShareRate',
      'employeePensionInsuranceRate',
      'employeePensionShareRate'
    ];
    // データ行（filteredRatesを使う）
    const rows = this.filteredRates.map(rate => [
      rate.insuranceType || '',
      rate.prefectureCode || '',
      rate.prefectureName || '',
      rate.validFrom || '',
      rate.validTo || '',
      rate.healthInsuranceBaseRate ?? '',
      rate.healthInsuranceSpecificRate ?? '',
      rate.healthInsuranceRate ?? '',
      rate.healthInsuranceShareRate ?? '',
      rate.careInsuranceRate ?? '',
      rate.careInsuranceShareRate ?? '',
      rate.employeePensionInsuranceRate ?? '',
      rate.employeePensionShareRate ?? ''
    ]);
    // CSV文字列生成
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    // ダウンロード処理
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'insurance-rate-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  onImportCsv(event: any) {
    const file = event.target.files[0];
    this.fileName = file ? file.name : '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      const { data, errors } = this.parseCsv(text);
      if (errors.length > 0) {
        alert('CSV取込エラー:\n' + errors.join('\n'));
        return;
      }
      // 既存データとマージ
      data.forEach(newRate => {
        const idx = this.rates.findIndex(r =>
          r.prefectureCode === newRate.prefectureCode &&
          r.validFrom === newRate.validFrom
        );
        if (idx !== -1) {
          // 上書き
          this.rates[idx] = { ...this.rates[idx], ...newRate };
        } else {
          // 追加
          this.rates.push(newRate);
        }
      });
      this.applyFilter();
      alert('CSVデータを一時反映しました。内容を確認し「変更を適用」してください。');
    };
    reader.readAsText(file, 'utf-8');
  }

  parseCsv(text: string): { data: InsuranceRate[], errors: string[] } {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { data: [], errors: ['CSVにデータがありません'] };
    const headers = lines[0].split(',');
    const data: InsuranceRate[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length !== headers.length) {
        errors.push(`${i+1}行目: 列数が一致しません`);
        continue;
      }
      // insuranceType必須チェック
      const insuranceType = cols[headers.indexOf('insuranceType')]?.trim();
      if (!insuranceType) {
        errors.push(`${i+1}行目: insuranceType（保険種別）が未入力です`);
        continue;
      }
      // 必須項目チェック
      const prefectureCode = cols[headers.indexOf('prefectureCode')]?.trim();
      const validFrom = cols[headers.indexOf('validFrom')]?.trim();
      if (!prefectureCode || !validFrom) {
        errors.push(`${i+1}行目: 都道府県コードまたは適用開始日がありません`);
        continue;
      }
      // 数値変換・バリデーション例
      const healthInsuranceBaseRate = Number(cols[headers.indexOf('healthInsuranceBaseRate')]);
      if (isNaN(healthInsuranceBaseRate) || healthInsuranceBaseRate < 0) {
        errors.push(`${i+1}行目: 基本保険料率が不正です`);
        continue;
      }
      // ...他の項目も同様に
      data.push({
        insuranceType,
        id: `${prefectureCode}_${validFrom}`,
        prefectureCode,
        prefectureName: this.prefectures.find(p => p.code === prefectureCode)?.name || '',
        validFrom,
        validTo: cols[headers.indexOf('validTo')]?.trim() || null,
        healthInsuranceBaseRate,
        healthInsuranceSpecificRate: Number(cols[headers.indexOf('healthInsuranceSpecificRate')]) || 0,
        healthInsuranceRate: Number(cols[headers.indexOf('healthInsuranceRate')]) || 0,
        healthInsuranceShareRate: Number(cols[headers.indexOf('healthInsuranceShareRate')]) || 0,
        careInsuranceRate: Number(cols[headers.indexOf('careInsuranceRate')]) || 0,
        careInsuranceShareRate: Number(cols[headers.indexOf('careInsuranceShareRate')]) || 0,
        employeePensionInsuranceRate: Number(cols[headers.indexOf('employeePensionInsuranceRate')]) || 0,
        employeePensionShareRate: Number(cols[headers.indexOf('employeePensionShareRate')]) || 0,
        updatedAt: new Date(),
      } as InsuranceRate);
    }
    return { data, errors };
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
        // ファイル選択inputの値とファイル名をリセット
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        this.fileName = '';
      });
    }).catch(err => {
      alert('更新に失敗しました: ' + err);
    });
  }

  resetChanges() {
    if (!window.confirm('データは保存されていません。変更をリセットしてよろしいですか？')) return;
    // Firestoreから再取得してローカルをリセット
    this.firestore.getInsuranceRates().subscribe(rates => {
      this.rates = rates.map(r => ({ ...r }));
      this.originalRates = rates.map(r => ({ ...r }));
      this.applyFilter();
      // ファイル選択inputの値とファイル名をリセット
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      this.fileName = '';
    });
  }
}
