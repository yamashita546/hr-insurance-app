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

  public dialogRef?: MatDialogRef<EditOfficeComponent>;

  office: any;
  prefectures = PREFECTURES;
  insuranceTypes = INSURANCE_TYPES;
  offices: any[] = [];
  headOfficeError: string = '';
  industryClassifications = INDUSTRY_CLASSIFICATIONS;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

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
  }

  onSave() {
    this.saved.emit(this.office);
  }

  onCancel() {
    this.cancelled.emit();
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
