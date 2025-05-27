import { Component, Output, EventEmitter, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { INSURANCE_TYPES } from '../../../../core/models/insurance-type';
import { CommonModule } from '@angular/common';

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

  office: any;
  prefectures = PREFECTURES;
  insuranceTypes = INSURANCE_TYPES;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    this.office = { ...this.data };

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
  }

  onSave() {
    this.saved.emit(this.office);
  }

  onCancel() {
    this.cancelled.emit();
  }
}
