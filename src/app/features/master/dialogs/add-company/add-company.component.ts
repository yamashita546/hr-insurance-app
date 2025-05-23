import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { collection, query } from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore';
import { AppUser } from '../../../../core/models/user.model';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';

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

  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private dialogRef: MatDialogRef<AddCompanyComponent>,
    private auth: Auth
  ) {
    this.form = this.fb.group({
      displayId: [''],
      companyName: ['', Validators.required],
      industry: [''],
      address: [''],
      contactEmail: ['', Validators.email],
      establishmentDate: ['', Validators.required]
    });
  }

  async onSubmit() {
    this.error = null;
    if (this.form.invalid) return;
    this.loading = true;
    try {
      // 会社情報を保存
      await this.firestoreService.addCompany({
        displayId: this.form.value.displayId,
        name: this.form.value.companyName,
        industry: this.form.value.industry,
        headOfficeAddress: this.form.value.address,
        establishmentDate: this.form.value.establishmentDate,
        isActive: true
      });
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
