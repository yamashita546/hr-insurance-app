import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { collection, query, where, orderBy, limit, getDocs } from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore';
import { AppUser } from '../../../../core/models/user.model';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Prefecture, PREFECTURES } from '../../../../core/models/prefecture.model';

function normalizeNumberInput(value: string): string {
  if (!value) return '';
  return value
    .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/[ー−―]/g, '-')
    .replace(/[^0-9-]/g, '');
}

function corporateNumberValidator(control: import('@angular/forms').AbstractControl) {
  const value = control.value;
  if (!value) return null; // 未入力はOK
  return /^\d{13}$/.test(value) ? null : { corporateNumberInvalid: true };
}

function normalizeZenkakuNumberHyphen(value: string): string {
  if (!value) return '';
  return value
    .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/[ー−―]/g, '-');
}

@Component({
  selector: 'app-add-company',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './add-company.component.html',
  styleUrl: './add-company.component.css'
})
export class AddCompanyComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  prefectures = PREFECTURES;

  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private dialogRef: MatDialogRef<AddCompanyComponent>,
    private auth: Auth
  ) {
    this.form = this.fb.group({
      displayId: [''],
      corporateNumber: ['', corporateNumberValidator],
      companyName: ['', Validators.required],
      industry: [''],
      companyOwner: [''],
      headOfficeAddress: this.fb.group({
        postalCode: [''],
        prefecture: [''],
        city: [''],
        town: [''],
        streetAddress: [''],
        buildingName: [''],
        countryCode: ['JP']
      }),
      establishmentDate: ['', Validators.required]
    });

    // valueChangesで自動正規化
    this.form.get('corporateNumber')?.valueChanges.subscribe(val => {
      if (val !== normalizeNumberInput(val)) {
        this.form.get('corporateNumber')?.setValue(normalizeNumberInput(val), { emitEvent: false });
      }
    });
    this.form.get('headOfficeAddress.postalCode')?.valueChanges.subscribe(val => {
      if (val !== normalizeNumberInput(val)) {
        this.form.get('headOfficeAddress.postalCode')?.setValue(normalizeNumberInput(val), { emitEvent: false });
      }
    });
    this.form.get('headOfficeAddress.town')?.valueChanges.subscribe(val => {
      if (val !== normalizeZenkakuNumberHyphen(val)) {
        this.form.get('headOfficeAddress.town')?.setValue(normalizeZenkakuNumberHyphen(val), { emitEvent: false });
      }
    });
    this.form.get('headOfficeAddress.streetAddress')?.valueChanges.subscribe(val => {
      if (val !== normalizeZenkakuNumberHyphen(val)) {
        this.form.get('headOfficeAddress.streetAddress')?.setValue(normalizeZenkakuNumberHyphen(val), { emitEvent: false });
      }
    });
    this.form.get('headOfficeAddress.buildingName')?.valueChanges.subscribe(val => {
      if (val !== normalizeZenkakuNumberHyphen(val)) {
        this.form.get('headOfficeAddress.buildingName')?.setValue(normalizeZenkakuNumberHyphen(val), { emitEvent: false });
      }
    });
  }

  async onSubmit() {
    this.error = null;
    if (this.form.invalid) return;
    this.loading = true;
    try {
      // displayId自動生成
      const prefCode = this.form.value.headOfficeAddress.prefecture;
      let nextDisplayId = '';
      if (prefCode) {
        const companiesRef = collection(this.firestoreService['firestore'], 'companies');
        const q = query(
          companiesRef,
          where('displayId', '>=', `${prefCode}-0000`),
          where('displayId', '<', `${prefCode}-9999`),
          orderBy('displayId', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        let nextNumber = 1;
        if (!snapshot.empty) {
          const lastId = snapshot.docs[0].data()['displayId'];
          const lastNum = parseInt(lastId.split('-')[1], 10);
          nextNumber = lastNum + 1;
        }
        nextDisplayId = `${prefCode}-${nextNumber.toString().padStart(4, '0')}`;
      }
      // 会社情報を保存
      await this.firestoreService.addCompany({
        displayId: nextDisplayId,
        corporateNumber: this.form.value.corporateNumber,
        name: this.form.value.companyName,
        industry: this.form.value.industry,
        companyOwner: this.form.value.companyOwner,
        headOfficeAddress: this.form.value.headOfficeAddress,
        establishmentDate: this.form.value.establishmentDate,
        isActive: true
      });
      alert('追加が完了しました');
      this.dialogRef.close(true);
    } catch (e: any) {
      this.error = e.message || '登録に失敗しました';
    } finally {
      this.loading = false;
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
