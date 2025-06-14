import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, getDocs, query, where, Timestamp, doc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppUser } from '../../../../core/models/user.model';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { CloudFunctionsService } from '../../../../core/services/cloud.functions.service';

@Component({
  selector: 'app-add-admin-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-admin-user.component.html',
  styleUrl: './add-admin-user.component.css'
})
export class AddAdminUserComponent {
  adminForm: FormGroup;
  errorMsg: string = '';
  loading: boolean = false;
  readonly companyKey = 'VF9FRgVnVlAaBbSaeU2q';

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private router: Router,
    private firestoreService: FirestoreService,
    private auth: Auth,
    private cloudFunctionsService: CloudFunctionsService
  ) {
    this.adminForm = this.fb.group({
      userId: ['', [Validators.required]],
      displayName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      initialPassword: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  async onSubmit() {
    this.errorMsg = '';
    if (this.adminForm.invalid) return;
    this.loading = true;
    const { userId, displayName, email, initialPassword } = this.adminForm.value;
    const companyKey = this.companyKey;
    try {
      // Cloud Functions経由で管理者ユーザーを作成
      await this.cloudFunctionsService.createUserByAdmin({
        email,
        password: initialPassword,
        displayName,
        companyKey,
        userId,
        role: 'admin',
        initialPassword,
      });
      alert('管理者ユーザーを追加しました');
      this.router.navigate(['/manage-admin']);
    } catch (e: any) {
      this.errorMsg = e.message || '登録に失敗しました';
    } finally {
      this.loading = false;
    }
  }
}
