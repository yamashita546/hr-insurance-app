import { Component, Inject, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-edit-my-company',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './edit-my-company.component.html',
  styleUrl: './edit-my-company.component.css'
})
export class EditMyCompanyComponent implements OnInit {
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  originalData: any;
  prefectures = PREFECTURES;

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.originalData = { ...this.data };
    this.form = this.fb.group({
      companyId: [{ value: this.data.companyId, disabled: true }],
      corporateNumber: [this.data.corporateNumber],
      companyName: [this.data.name, Validators.required],
      industry: [this.data.industry],
      companyOwner: [this.data.companyOwner],
      headOfficeAddress: this.fb.group({
        postalCode: [this.data.headOfficeAddress?.postalCode],
        prefecture: [this.data.headOfficeAddress?.prefecture],
        city: [this.data.headOfficeAddress?.city],
        town: [this.data.headOfficeAddress?.town],
        streetAddress: [this.data.headOfficeAddress?.streetAddress],
        buildingName: [this.data.headOfficeAddress?.buildingName],
        countryCode: [this.data.headOfficeAddress?.countryCode || 'JP']
      }),
      establishmentDate: [this.data.establishmentDate, Validators.required],
      salaryClosingDate: [this.data.salaryClosingDate]
    });
  }

  onSave() {
    if (this.form.invalid) return;
    const updated = {
      ...this.data,
      ...this.form.getRawValue(),
      name: this.form.value.companyName
    };
    this.saved.emit(updated);
  }

  onCancel() {
    this.cancelled.emit();
  }
}
