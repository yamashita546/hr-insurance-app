import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DateTimestampPipe } from '../../../../core/pipe/date-timestamp.pipe';
import { GradeType, HealthInsuranceGrade, PensionInsuranceGrade } from '../../../../core/models/standard-manthly.model';
import { INSURANCE_TYPES, InsuranceType } from '../../../../core/models/insurance-type';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { MatDialog } from '@angular/material/dialog';
import { AddStandardMonthlyComponent } from '../../dialogs/add-standard-monthly/add-standard-monthly.component';
import { EditStandardMonthlyComponent } from '../../dialogs/edit-standard-monthly/edit-standard-monthly.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-standard-monthly',
  standalone: true,
  imports: [FormsModule, DateTimestampPipe, CommonModule],
  templateUrl: './standard-monthly.component.html',
  styleUrl: './standard-monthly.component.css'
})
export class StandardMonthlyComponent {
  years: number[] = [];
  selectedYear: number = 0;
  selectedGradeType: GradeType = GradeType.HEALTH;
  selectedInsuranceType: string = '';
  grades: (HealthInsuranceGrade | PensionInsuranceGrade)[] = [];
  filteredGrades: (HealthInsuranceGrade | PensionInsuranceGrade)[] = [];
  selectedGrade: HealthInsuranceGrade | PensionInsuranceGrade | null = null;
  fileName: string = '';
  insuranceTypes: InsuranceType[] = INSURANCE_TYPES;
  GradeType = GradeType; // テンプレート用

  // ソート状態
  sortKey: string = '';
  sortAsc: boolean = true;

  originalGrades: (HealthInsuranceGrade | PensionInsuranceGrade)[] = [];

  dialogRef: any = null; // ダイアログ多重起動防止用

  constructor(private firestore: FirestoreService, private dialog: MatDialog) {
    this.firestore.getStandardMonthlyGrades().subscribe(grades => {
      this.grades = grades.map(g => ({ ...g }));
      this.originalGrades = grades.map(g => ({ ...g }));
      // 年度リストをデータベースにある年度＋未来2年分で生成
      const currentYear = new Date().getFullYear();
      const dbYears = grades.map(g => Number(g.validFrom?.substr(0, 4))).filter(y => !!y);
      const futureYears = [0, 1].map(offset => currentYear + offset);
      const allYears = Array.from(new Set([...dbYears, ...futureYears])).sort((a, b) => b - a);
      this.years = allYears;
      this.applyFilter();
    });

    // ソート状態の復元
    const savedSortKey = localStorage.getItem('standardMonthlySortKey');
    const savedSortAsc = localStorage.getItem('standardMonthlySortAsc');
    if (savedSortKey) this.sortKey = savedSortKey;
    if (savedSortAsc !== null) this.sortAsc = savedSortAsc === 'true';

    // 選択状態の復元
    const savedYear = localStorage.getItem('standardMonthlySelectedYear');
    const savedGradeType = localStorage.getItem('standardMonthlySelectedGradeType');
    const savedInsuranceType = localStorage.getItem('standardMonthlySelectedInsuranceType');
    if (savedYear) this.selectedYear = Number(savedYear);
    if (savedGradeType) this.selectedGradeType = savedGradeType as GradeType;
    if (savedInsuranceType !== null) this.selectedInsuranceType = savedInsuranceType;
  }

  onYearChange(event: any) {
    this.selectedYear = Number(this.selectedYear);
    localStorage.setItem('standardMonthlySelectedYear', String(this.selectedYear));
    this.applyFilter();
  }
  onInsuranceTypeChange(event: any) {
    localStorage.setItem('standardMonthlySelectedInsuranceType', this.selectedInsuranceType);
    this.applyFilter();
  }
  onGradeTypeChange(event: any) {
    localStorage.setItem('standardMonthlySelectedGradeType', this.selectedGradeType);
    this.applyFilter();
  }

  applyFilter() {
    this.filteredGrades = this.grades.filter(grade => {
      const yearMatch = !this.selectedYear || (grade.validFrom && grade.validFrom.substr(0, 4) === String(this.selectedYear));
      const gradeTypeMatch = !this.selectedGradeType || grade.gradeType === this.selectedGradeType;
      const insuranceTypeMatch = !this.selectedInsuranceType || grade.insuranceType === this.selectedInsuranceType;
      return yearMatch && gradeTypeMatch && insuranceTypeMatch;
    });
    this.selectedGrade = null;
    if (this.sortKey) {
      this.sortBy(this.sortKey);
    } else {
      // デフォルトで等級昇順
      this.filteredGrades.sort((a, b) => a.grade - b.grade);
    }
  }

  sortBy(key: string) {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = true;
    }
    // ソート状態をlocalStorageに保存
    localStorage.setItem('standardMonthlySortKey', this.sortKey);
    localStorage.setItem('standardMonthlySortAsc', String(this.sortAsc));
    this.filteredGrades.sort((a: any, b: any) => {
      let valA = a[key];
      let valB = b[key];
      // 年度（validFrom）は文字列なので数値比較
      if (key === 'validFrom') {
        valA = valA ? Number(valA.substr(0, 4)) : 0;
        valB = valB ? Number(valB.substr(0, 4)) : 0;
      }
      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });
  }

  onAdd() {
    if (this.dialogRef) return;
    this.dialogRef = this.dialog.open(AddStandardMonthlyComponent, {
      width: '400px',
      height: '90vh',
      disableClose: true
    });
    const instance = this.dialogRef.componentInstance;
    if (instance) {
      instance.added.subscribe(async (newGrade: any) => {
        const docId = newGrade.id;
        await this.firestore.addOrUpdateStandardMonthlyGradeById(docId, newGrade);
        this.dialogRef.close();
        this.dialogRef = null;
        // Firestoreから再取得
        this.firestore.getStandardMonthlyGrades().subscribe(grades => {
          this.grades = grades.map(g => ({ ...g }));
          this.originalGrades = grades.map(g => ({ ...g }));
          this.applyFilter();
        });
      });
      instance.cancelled.subscribe(() => {
        this.dialogRef.close();
        this.dialogRef = null;
      });
    }
  }
  onEdit(grade?: any) {
    if (this.dialogRef) return;
    const target = grade || this.selectedGrade;
    if (!target) return;
    this.dialogRef = this.dialog.open(EditStandardMonthlyComponent, {
      width: '450px',
      height: '90vh',
      data: { ...target },
      disableClose: true
    });
    const instance = this.dialogRef.componentInstance;
    if (instance) {
      instance.data = { ...target };
      instance.saved.subscribe((updated: any) => {
        console.log('[StandardMonthlyComponent] onEdit updated:', updated);
        // 調査用: findIndexの各条件で一致するか確認
        this.grades.forEach((g, i) => {
          console.log(`[findIndex調査] index:${i} id一致:${g.id === updated.id} gradeType一致:${g.gradeType === updated.gradeType} insuranceType一致:${g.insuranceType === updated.insuranceType}`, g, updated);
        });
        const idx = this.grades.findIndex(g => g.id === updated.id && g.gradeType === updated.gradeType && g.insuranceType === updated.insuranceType);
        console.log('[StandardMonthlyComponent] findIndex result idx:', idx);
        if (idx !== -1) {
          this.grades[idx] = { ...updated };
          console.log('[StandardMonthlyComponent] grades after update:', this.grades);
          this.applyFilter();
        } else {
          console.warn('[StandardMonthlyComponent] 編集対象が見つかりませんでした', updated);
        }
        this.dialogRef.close();
        this.dialogRef = null;
      });
      instance.cancelled.subscribe(() => {
        this.dialogRef.close();
        this.dialogRef = null;
      });
    }
  }
  async applyChanges() {
    if (this.dialogRef) return;
    // 差分のみ抽出
    const updatedGrades = this.grades.filter(grade => {
      const original = this.originalGrades.find(g => g.id === grade.id && g.gradeType === grade.gradeType && g.insuranceType === grade.insuranceType);
      return !original || Object.keys(grade).some(key => grade[key as keyof typeof grade] !== original[key as keyof typeof grade]);
    });
    if (updatedGrades.length === 0) {
      alert('変更はありません');
      return;
    }
    const promises = updatedGrades.map(grade => {
      const docId = `${String(grade.gradeType).trim()}_${String(grade.insuranceType).trim()}_${String(grade.grade).trim()}_${String(grade.validFrom).trim()}`;
      console.log('[StandardMonthlyComponent] applyChanges docId:', docId, 'grade:', grade);
      return this.firestore.addOrUpdateStandardMonthlyGradeById(docId, grade);
    });
    await Promise.all(promises);
    alert('変更を適用しました');
    // Firestoreから再取得してローカルを最新化
    this.firestore.getStandardMonthlyGrades().subscribe(grades => {
      this.grades = grades.map(g => ({ ...g }));
      this.originalGrades = grades.map(g => ({ ...g }));
      this.applyFilter();
    });
    // ファイル選択inputの値とファイル名をリセット
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    this.fileName = '';
  }

  resetChanges() {
    if (this.dialogRef) return;
    if (!window.confirm('データは保存されていません。変更をリセットしてよろしいですか？')) return;
    // Firestoreから再取得してローカルをリセット
    this.firestore.getStandardMonthlyGrades().subscribe(grades => {
      this.grades = grades.map(g => ({ ...g }));
      this.originalGrades = grades.map(g => ({ ...g }));
      this.applyFilter();
      // ファイル選択inputの値とファイル名をリセット
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      this.fileName = '';
    });
  }

  selectGrade(grade: any) { this.selectedGrade = grade; }
  onExportCsv() {
    // 現在のフィルタ条件を取得
    const gradeTypeLabel = this.selectedGradeType === GradeType.HEALTH ? '健康保険' : '厚生年金';
    const insuranceTypeLabel = this.selectedInsuranceType
      ? (this.insuranceTypes.find(t => t.code === this.selectedInsuranceType)?.name || this.selectedInsuranceType)
      : '全て';
    const yearLabel = this.selectedYear ? `${this.selectedYear}年度` : '全年度';
    const msg = `現在表示されている「${gradeTypeLabel}」「${insuranceTypeLabel}」「${yearLabel}」をひな型としてCSV出力します。よろしいですか？`;
    if (!window.confirm(msg)) return;
    // CSVヘッダー（idは除外）
    const headers = [
      'gradeType',
      'insuranceType',
      'grade',
      'compensation',
      'lowerLimit',
      'upperLimit',
      'validFrom',
      'validTo'
    ];
    // データ行
    const rows = this.filteredGrades.map(grade => [
      grade.gradeType,
      grade.insuranceType,
      grade.grade,
      grade.compensation,
      grade.lowerLimit,
      grade.upperLimit,
      grade.validFrom,
      grade.validTo || ''
    ]);
    // CSV文字列生成
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    // ダウンロード処理
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'standard-monthly-template.csv';
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
      data.forEach(newGrade => {
        const idx = this.grades.findIndex(g => g.id === newGrade.id && g.gradeType === newGrade.gradeType && g.insuranceType === newGrade.insuranceType);
        if (idx !== -1) {
          // 上書き
          this.grades[idx] = { ...this.grades[idx], ...newGrade };
        } else {
          // 追加
          this.grades.push(newGrade);
        }
      });
      this.applyFilter();
      alert('CSVデータを一時反映しました。内容を確認し「変更を適用」してください。');
    };
    reader.readAsText(file, 'utf-8');
  }

  parseCsv(text: string): { data: (HealthInsuranceGrade | PensionInsuranceGrade)[], errors: string[] } {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { data: [], errors: ['CSVにデータがありません'] };
    const headers = lines[0].split(',');
    const data: (HealthInsuranceGrade | PensionInsuranceGrade)[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length !== headers.length) {
        errors.push(`${i+1}行目: 列数が一致しません`);
        continue;
      }
      // 必須項目チェック
      const gradeType = cols[headers.indexOf('gradeType')]?.trim();
      const insuranceType = cols[headers.indexOf('insuranceType')]?.trim();
      const grade = Number(cols[headers.indexOf('grade')]);
      const compensation = Number(cols[headers.indexOf('compensation')]);
      const lowerLimit = Number(cols[headers.indexOf('lowerLimit')]);
      const upperLimitStr = cols[headers.indexOf('upperLimit')]?.trim();
      const upperLimit = upperLimitStr === '' ? null : Number(upperLimitStr);
      const validFrom = cols[headers.indexOf('validFrom')]?.trim();
      const validTo = cols[headers.indexOf('validTo')]?.trim() || '';
      if (!gradeType || !insuranceType || !grade || !compensation || !validFrom) {
        errors.push(`${i+1}行目: 必須項目が不足しています`);
        continue;
      }
      if (gradeType !== 'health' && gradeType !== 'pension') {
        errors.push(`${i+1}行目: gradeTypeが不正です（health/pensionのみ）`);
        continue;
      }
      if (insuranceType !== '1' && insuranceType !== '2') {
        errors.push(`${i+1}行目: insuranceTypeが不正です（1/2のみ）`);
        continue;
      }
      // idは一貫してgradeType_insuranceType_grade_validFrom形式で生成
      const id = `${gradeType}_${insuranceType}_${grade}_${validFrom}`;
      data.push({
        gradeType: gradeType as GradeType,
        insuranceType,
        id,
        grade,
        compensation,
        lowerLimit,
        upperLimit,
        validFrom,
        validTo,
        updatedAt: new Date()
      } as HealthInsuranceGrade | PensionInsuranceGrade);
    }
    return { data, errors };
  }

  async onDelete() {
    if (this.dialogRef) return;
    if (!this.selectedGrade) return;
    if (!window.confirm('本当に削除しますか？')) return;
    const docId = `${this.selectedGrade.gradeType}_${this.selectedGrade.insuranceType}_${this.selectedGrade.id}`;
    await this.firestore.deleteStandardMonthlyGrade(docId);
    alert('削除しました');
    // Firestoreから再取得
    this.firestore.getStandardMonthlyGrades().subscribe(grades => {
      this.grades = grades.map(g => ({ ...g }));
      this.applyFilter();
    });
  }

  isCellChanged(grade: HealthInsuranceGrade | PensionInsuranceGrade, field: keyof (HealthInsuranceGrade | PensionInsuranceGrade)): boolean {
    const original = this.originalGrades.find(g => g.id === grade.id && g.gradeType === grade.gradeType && g.insuranceType === grade.insuranceType);
    if (!original) return false;
    const current = grade[field];
    const orig = original[field];
    if (current == null && orig == null) return false;
    if (typeof current === 'number' && typeof orig === 'number') {
      return current !== orig;
    }
    return current !== orig;
  }
}
