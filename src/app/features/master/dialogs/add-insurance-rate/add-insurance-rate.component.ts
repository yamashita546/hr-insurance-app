import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add-insurance-rate',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './add-insurance-rate.component.html',
  styleUrl: './add-insurance-rate.component.css'
})
export class AddInsuranceRateComponent implements OnInit {
  @Output() added = new EventEmitter<void>();

  prefectures = PREFECTURES;
  form: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: FirestoreService,
    private dialogRef: MatDialogRef<AddInsuranceRateComponent>
  ) {
    this.form = this.fb.group({
      prefectureCode: ['', Validators.required],
      validFrom: ['', Validators.required],
      validTo: [''],
      healthInsuranceBaseRate: ['', [Validators.required, Validators.min(0)]],
      healthInsuranceSpecificRate: ['', [Validators.required, Validators.min(0)]],
      healthInsuranceRate: ['', [Validators.required, Validators.min(0)]],
      healthInsuranceShareRate: ['', [Validators.required, Validators.min(0)]],
      careInsuranceRate: [''],
      careInsuranceShareRate: [''],
      employeePensionInsuranceRate: ['', [Validators.required, Validators.min(0)]],
      employeePensionShareRate: ['', [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    // 健康保険 基本・特定保険料率の合算を自動で健康保険料率にセット
    this.form.get('healthInsuranceBaseRate')?.valueChanges.subscribe(() => this.updateHealthInsuranceRate());
    this.form.get('healthInsuranceSpecificRate')?.valueChanges.subscribe(() => this.updateHealthInsuranceRate());

    // 健康保険料率が変わったら自動で折半割合をセット
    this.form.get('healthInsuranceRate')?.valueChanges.subscribe((rate: string) => {
      this.updateShareRate('healthInsuranceShareRate', rate);
    });
    // 介護保険料率が変わったら自動で折半割合をセット
    this.form.get('careInsuranceRate')?.valueChanges.subscribe((rate: string) => {
      this.updateShareRate('careInsuranceShareRate', rate);
    });
    // 厚生年金保険料率が変わったら自動で折半割合をセット
    this.form.get('employeePensionInsuranceRate')?.valueChanges.subscribe((rate: string) => {
      this.updateShareRate('employeePensionShareRate', rate);
    });
  }

  updateHealthInsuranceRate() {
    const base = Number(this.form.get('healthInsuranceBaseRate')?.value) || 0;
    const specific = Number(this.form.get('healthInsuranceSpecificRate')?.value) || 0;
    const sum = (base + specific).toFixed(3);
    this.form.patchValue({ healthInsuranceRate: sum }, { emitEvent: false });
    this.updateShareRate('healthInsuranceShareRate', sum);
  }

  updateShareRate(field: string, rate: string | number) {
    const num = Number(rate);
    if (!isNaN(num)) {
      this.form.patchValue({
        [field]: (num / 2).toFixed(3)
      }, { emitEvent: false });
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    try {
      const value = this.form.value;
      const prefectureName = this.prefectures.find(p => p.code === value.prefectureCode)?.name || '';
      const docId = `${value.prefectureCode}_${value.validFrom}`;
      // FirestoreServiceのupdateInsuranceRateを呼び出す（実装例）
      await this.firestore.updateInsuranceRate(docId, { ...value, prefectureName });
      // サンプルとしてemitのみ
      this.added.emit();
      this.form.reset();
      this.dialogRef.close();
    } catch (e: any) {
      this.error = '登録に失敗しました';
    } finally {
      this.loading = false;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
