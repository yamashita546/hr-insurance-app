import { Component, Output, EventEmitter, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { INSURANCE_TYPES } from '../../../../core/models/insurance-type';
import { CommonModule } from '@angular/common';
import { INDUSTRY_CLASSIFICATIONS } from '../../../../core/models/industry-classification.model';

@Component({
  selector: 'app-edit-office',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './edit-office.component.html',
  styleUrl: './edit-office.component.css'
})
export class EditOfficeComponent implements OnInit {
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<EditOfficeComponent>
  ) {}

  office: any;
  prefectures = PREFECTURES;
  insuranceTypes = INSURANCE_TYPES;
  offices: any[] = [];
  headOfficeError: string = '';
  industryClassifications = INDUSTRY_CLASSIFICATIONS;
  postalCodeError: boolean = false;

  ngOnInit() {
    const { offices, ...officeData } = this.data;
    this.office = officeData;
    this.offices = this.data.offices || [];

    // 都道府県がオブジェクト型の場合はコード値に変換
    if (typeof this.office.address?.prefecture === 'object' && this.office.address.prefecture?.code) {
      this.office.address.prefecture = this.office.address.prefecture.code;
    }
    // 適用保険事業所も同様
    if (typeof this.office.insurancePrefecture === 'object' && this.office.insurancePrefecture?.code) {
      this.office.insurancePrefecture = this.office.insurancePrefecture.code;
    }
    // 保険種別も同様
    if (typeof this.office.insuranceType === 'object' && this.office.insuranceType?.code) {
      this.office.insuranceType = this.office.insuranceType.code;
    }
    // 業種分類がオブジェクト型ならcodeに変換
    if (typeof this.office.industryClassification === 'object' && this.office.industryClassification?.code) {
      this.office.industryClassification = this.office.industryClassification.code;
    }
    // 給与締め日が未定義なら空文字で初期化
    if (!this.office.salaryClosingDate) {
      this.office.salaryClosingDate = '';
    }
    // 郵便番号を分割
    if (this.office.address?.postalCode) {
      const [first, last] = this.office.address.postalCode.split('-');
      this.office.address.postalCodeFirst = first || '';
      this.office.address.postalCodeLast = last || '';
    }
  }

  onSave() {
    // 郵便番号バリデーション（trim()で前後の空白を除去）
    const first = (this.office.address.postalCodeFirst || '').trim();
    const last = (this.office.address.postalCodeLast || '').trim();

    // console.log(`保存ボタンクリック時の値を確認: 郵便番号1「${first}」, 郵便番号2「${last}」`);

    this.postalCodeError = !/^\d{3}$/.test(first) || !/^\d{4}$/.test(last);

    if (this.postalCodeError) {
      // console.log('郵便番号バリデーションに失敗しました。');
      return;
    }

    // console.log('郵便番号バリデーションに成功しました。');

    this.office.address.postalCode = `${first}-${last}`;
    // 所定労働日数・時間を明示的にセット（未入力時は空文字）
    this.office.workingDays = this.office.workingDays ?? '';
    this.office.workingHours = this.office.workingHours ?? '';

    this.dialogRef.close(this.office);
  }

  onCancel() {
    this.dialogRef.close();
  }

  onHeadOfficeChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      const exists = this.offices.some(o => o.isHeadOffice && o.id !== this.office.id);
      if (exists) {
        this.headOfficeError = 'この企業には既に本社が登録されています。';
        this.office.isHeadOffice = false;
      } else {
        this.headOfficeError = '';
      }
    } else {
      this.headOfficeError = '';
    }
  }

  getIndustryClassificationName(code: string): string {
    const found = this.industryClassifications.find(c => c.code === code);
    return found ? found.name : code;
  }
}
