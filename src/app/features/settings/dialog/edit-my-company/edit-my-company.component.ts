import { Component, Inject, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
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
    let postalCodeFirst = '';
    let postalCodeLast = '';
    if (this.data.headOfficeAddress?.postalCode) {
      const [first, last] = this.data.headOfficeAddress.postalCode.split('-');
      postalCodeFirst = first || '';
      postalCodeLast = last || '';
    }
    this.form = this.fb.group({
      companyId: [{ value: this.data.companyId, disabled: true }],
      corporateNumber: [this.data.corporateNumber],
      companyName: [this.data.name, Validators.required],
      industry: [this.data.industry],
      companyOwner: [this.data.companyOwner],
      headOfficeAddress: this.fb.group({
        postalCodeFirst: [postalCodeFirst, [Validators.required, EditMyCompanyComponent.postalCodeFirstValidator]],
        postalCodeLast: [postalCodeLast, [Validators.required, EditMyCompanyComponent.postalCodeLastValidator]],
        prefecture: [this.data.headOfficeAddress?.prefecture],
        city: [this.data.headOfficeAddress?.city],
        town: [this.data.headOfficeAddress?.town],
        streetAddress: [this.data.headOfficeAddress?.streetAddress],
        buildingName: [this.data.headOfficeAddress?.buildingName],
        countryCode: [this.data.headOfficeAddress?.countryCode || 'JP']
      }),
      establishmentDate: [this.data.establishmentDate, Validators.required],
      salaryClosingDate: [this.data.salaryClosingDate, Validators.required]
    });
  }

  onSave() {
    if (this.form.invalid) return;
    const updated = {
      ...this.data,
      ...this.form.getRawValue(),
      name: this.form.value.companyName
    };
    const address = { ...updated.headOfficeAddress };
    address.postalCode = `${address.postalCodeFirst}-${address.postalCodeLast}`;
    delete address.postalCodeFirst;
    delete address.postalCodeLast;
    updated.headOfficeAddress = address;
    this.saved.emit(updated);
  }

  onCancel() {
    this.cancelled.emit();
  }

  get postalCodeFirstCtrl() {
    return this.form.get('headOfficeAddress.postalCodeFirst');
  }
  get postalCodeLastCtrl() {
    return this.form.get('headOfficeAddress.postalCodeLast');
  }

  static postalCodeFirstValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!/^[0-9]{3}$/.test(value)) return { pattern: true };
    return null;
  }
  static postalCodeLastValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!/^[0-9]{4}$/.test(value)) return { pattern: true };
    return null;
  }
}
