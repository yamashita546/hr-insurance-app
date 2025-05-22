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
      companyName: ['', Validators.required],
      industry: [''],
      address: [''],
      contactEmail: ['', Validators.email],
      ownerEmail: ['', [Validators.required, Validators.email]],
      ownerName: [''],
      ownerPassword: ['', Validators.required]
    });
  }

  async onSubmit() {
    this.error = null;
    if (this.form.invalid) return;
    this.loading = true;
    try {
      // 1. 会社情報を保存
      const companyId = await this.firestoreService.addCompany({
        name: this.form.value.companyName,
        industry: this.form.value.industry,
        address: this.form.value.address,
        contactEmail: this.form.value.contactEmail,
        isActive: true
      });

      // 2. ownerユーザーをFirebase Authに仮登録
      const cred = await createUserWithEmailAndPassword(
        this.auth,
        this.form.value.ownerEmail,
        this.form.value.ownerPassword
      );
      const ownerUid = cred.user.uid;

      // 3. Firestoreのusersコレクションに仮登録
      await this.firestoreService.addUser({
        email: this.form.value.ownerEmail,
        displayName: this.form.value.ownerName,
        companyId,
        role: 'owner',
        uid: ownerUid,
        isRegistered: false
      }, ownerUid);

      // 4. invitesコレクションにも追加（必要に応じて）
      await this.firestoreService.inviteOwner(
        this.form.value.ownerEmail,
        companyId,
        this.form.value.ownerPassword
      );

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
