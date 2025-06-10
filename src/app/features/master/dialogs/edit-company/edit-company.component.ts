import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PREFECTURES } from '../../../../core/models/prefecture.model';

@Component({
  selector: 'app-edit-company',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './edit-company.component.html',
  styleUrl: './edit-company.component.css'
})
export class EditCompanyComponent implements OnInit {
  @Input() data: any;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  originalData: any;
  prefectures = PREFECTURES;

  constructor(private fb: FormBuilder) {}

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
