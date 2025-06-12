import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Office } from '../../../../core/models/company.model';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { InsuranceType, INSURANCE_TYPES } from '../../../../core/models/insurance-type';
import { Company } from '../../../../core/models/company.model';
import { INDUSTRY_CLASSIFICATIONS } from '../../../../core/models/industry-classification.model';
import { MatDialogRef } from '@angular/material/dialog';



@Component({
  selector: 'app-add-office',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './add-office.component.html',
  styleUrl: './add-office.component.css'
})
export class AddOfficeComponent implements OnInit {
  @Output() saved = new EventEmitter<Office>();
  @Output() cancelled = new EventEmitter<void>();

  public dialogRef?: MatDialogRef<AddOfficeComponent>;
  form!: FormGroup;
  prefectures = PREFECTURES;
  insuranceTypes = INSURANCE_TYPES;
  
  companyKey: string = '';
  companyId: string = '';
  companyHeadOfficeAddress: any = null;
  industryClassifications = INDUSTRY_CLASSIFICATIONS;
  office: any = {};

  constructor(private fb: FormBuilder, private userCompanyService: UserCompanyService) {}

  ngOnInit() {
    // フォームは一度だけ初期化
    this.form = this.fb.group({
      companyKey: [{ value: this.companyKey, disabled: true }, Validators.required],
      name: ['', Validators.required],
      isHeadOffice: [false],
      address: this.fb.group({
        postalCodeFirst: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
        postalCodeLast: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
        prefecture: [''],
        city: [''],
        town: [''],
        streetAddress: [''],
        buildingName: [''],
        countryCode: ['JP']
      }),
      insuranceType: ['', Validators.required],
      insurancePrefecture: ['', Validators.required],
      industryClassification: [''],
      officeCode: [''],
      validFrom: [''],
      validTo: [''],
      isActive: [true],
      salaryClosingDate: ['']
    });

    // 会社情報が変わったときは値だけpatch
    this.userCompanyService.company$.subscribe(company => {
      this.companyKey = company?.companyKey || '';
      this.companyId = company?.companyId || '';
      this.companyHeadOfficeAddress = company?.headOfficeAddress || null;
      this.form.patchValue({
        companyKey: this.companyKey
      });
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

    // 郵便番号の値が変わるたびにバリデーション状態を出力
    this.form.get('address.postalCodeFirst')?.valueChanges.subscribe(val => {
      console.log('postalCodeFirst:', val, this.form.get('address.postalCodeFirst')?.errors);
      this.form.get('address')?.updateValueAndValidity();
    });
    this.form.get('address.postalCodeLast')?.valueChanges.subscribe(val => {
      console.log('postalCodeLast:', val, this.form.get('address.postalCodeLast')?.errors);
      this.form.get('address')?.updateValueAndValidity();
    });

    // 必要に応じてofficeの初期化や型変換処理を追加
    if (typeof this.office.industryClassification === 'object' && this.office.industryClassification?.code) {
      this.office.industryClassification = this.office.industryClassification.code;
    }

    console.log(this.form.get('address.postalCodeFirst')?.value, this.form.get('address.postalCodeFirst')?.errors);
    console.log(this.form.get('address.postalCodeLast')?.value, this.form.get('address.postalCodeLast')?.errors);
  }

  onSave() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    // 郵便番号を結合
    const postalCode = `${raw.address.postalCodeFirst}-${raw.address.postalCodeLast}`;
    const office: Office = {
      ...raw,
      address: {
        ...raw.address,
        postalCode,
        postalCodeFirst: undefined,
        postalCodeLast: undefined
      },
      companyKey: this.companyKey,
      createdAt: new Date(),
      updatedAt: new Date(),
      id: '', // Firestoreで自動生成 or 保存時に付与
      salaryClosingDate: this.form.value.salaryClosingDate
    };
    this.saved.emit(office);
  }

  onCancel() {
    this.cancelled.emit();
  }

  get postalCodeFirstCtrl() {
    return this.form.get('address.postalCodeFirst');
  }
  get postalCodeLastCtrl() {
    return this.form.get('address.postalCodeLast');
  }
}
