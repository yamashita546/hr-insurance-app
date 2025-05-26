import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Office } from '../../../../core/models/company.model';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { InsuranceType, INSURANCE_TYPES } from '../../../../core/models/insurance-type';
import { Company } from '../../../../core/models/company.model';

@Component({
  selector: 'app-add-branch',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './add-branch.component.html',
  styleUrl: './add-branch.component.css'
})
export class AddBranchComponent implements OnInit {
  @Output() saved = new EventEmitter<Office>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  prefectures = PREFECTURES;
  insuranceTypes = INSURANCE_TYPES;
  companyId: string = '';
  companyDisplayId: string = '';
  companyHeadOfficeAddress: any = null;

  constructor(private fb: FormBuilder, private userCompanyService: UserCompanyService) {}

  ngOnInit() {
    this.userCompanyService.company$.subscribe(company => {
      this.companyId = company?.companyId || '';
      this.companyDisplayId = company?.displayId || '';
      this.companyHeadOfficeAddress = company?.headOfficeAddress || null;
      this.form = this.fb.group({
        companyId: [{ value: this.companyDisplayId, disabled: true }, Validators.required],
        name: ['', Validators.required],
        isHeadOffice: [false],
        address: this.fb.group({
          postalCode: [''],
          prefecture: [''],
          city: [''],
          town: [''],
          streetAddress: [''],
          buildingName: [''],
          countryCode: ['JP']
        }),
        insuranceType: [''],
        insurancePrefecture: [''],
        businessCategoryId: [''],
        officeCode: [''],
        validFrom: [''],
        validTo: [''],
        isActive: [true]
      });

      // 本社フラグの変更を監視し、チェック時に本社住所を自動入力
      this.form.get('isHeadOffice')?.valueChanges.subscribe((checked: boolean) => {
        if (checked && this.companyHeadOfficeAddress) {
          this.form.get('address')?.patchValue({ ...this.companyHeadOfficeAddress });
        }
      });

      // 住所の都道府県が変更されたら、適用保険事業所も同じ都道府県コードに自動設定
      this.form.get('address.prefecture')?.valueChanges.subscribe((prefCode: string) => {
        this.form.get('insurancePrefecture')?.setValue(prefCode);
      });
    });
  }

  onSave() {
    if (this.form.invalid) return;
    const office: Office = {
      ...this.form.getRawValue(),
      companyId: this.companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      id: '', // Firestoreで自動生成 or 保存時に付与
    };
    this.saved.emit(office);
  }

  onCancel() {
    this.cancelled.emit();
  }
}
