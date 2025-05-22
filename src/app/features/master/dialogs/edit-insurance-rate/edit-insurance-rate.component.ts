import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InsuranceRate } from '../../../../core/models/insurance-rate.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-edit-insurance-rate',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './edit-insurance-rate.component.html',
  styleUrl: './edit-insurance-rate.component.css'
})
export class EditInsuranceRateComponent implements OnInit {
  @Input() data!: InsuranceRate;
  @Output() saved = new EventEmitter<InsuranceRate>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  originalData!: InsuranceRate;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.originalData = { ...this.data };
    this.form = this.fb.group({
      healthInsuranceBaseRate: [this.data.healthInsuranceBaseRate, [Validators.required, Validators.min(0)]],
      healthInsuranceSpecificRate: [this.data.healthInsuranceSpecificRate, [Validators.required, Validators.min(0)]],
      healthInsuranceRate: [this.data.healthInsuranceRate, [Validators.required, Validators.min(0)]],
      healthInsuranceShareRate: [this.data.healthInsuranceShareRate, [Validators.required, Validators.min(0)]],
      careInsuranceRate: [this.data.careInsuranceRate],
      careInsuranceShareRate: [this.data.careInsuranceShareRate],
      employeePensionInsuranceRate: [this.data.employeePensionInsuranceRate, [Validators.required, Validators.min(0)]],
      employeePensionShareRate: [this.data.employeePensionShareRate, [Validators.required, Validators.min(0)]],
      validFrom: [this.data.validFrom, Validators.required],
      validTo: [this.data.validTo],
      prefectureCode: [this.data.prefectureCode, Validators.required],
      prefectureName: [this.data.prefectureName, Validators.required],
    });

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

  isChanged(field: string): boolean {
    return this.form.get(field)?.value !== this.originalData[field as keyof InsuranceRate];
  }

  onSave() {
    if (this.form.invalid) return;
    const updated: InsuranceRate = {
      ...this.data,
      ...this.form.value
    };
    this.saved.emit(updated);
  }

  onCancel() {
    this.cancelled.emit();
  }
}
