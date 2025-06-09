import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppUser } from '../../../../core/models/user.model';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Company } from '../../../../core/models/company.model';
import { CloudFunctionsService } from '../../../../core/services/cloud.functions.service';

@Component({
  selector: 'app-add-owner-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-owner-user.component.html',
  styleUrl: './add-owner-user.component.css'
})
export class AddOwnerUserComponent {
  ownerForm: FormGroup;
  errorMsg: string = '';
  loading: boolean = false;
  companies: Company[] = [];

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private router: Router,
    private firestoreService: FirestoreService,
    private auth: Auth,
    private cloudFunctionsService: CloudFunctionsService
  ) {
    this.ownerForm = this.fb.group({
      companyKey: ['', [Validators.required]],
      userId: ['', [Validators.required]],
      displayName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      initialPassword: ['', [Validators.required, Validators.minLength(8)]]
    });
    this.loadCompanies();
  }

  async loadCompanies() {
    this.companies = await new Promise<Company[]>(resolve => {
      this.firestoreService.getCompanies().subscribe(companies => resolve(companies));
    });
  }

  async onSubmit() {
    this.errorMsg = '';
    if (this.ownerForm.invalid) return;
    this.loading = true;
    const { companyKey, userId, displayName, email, initialPassword } = this.ownerForm.value;
    try {
      // Cloud Functions経由でオーナーユーザーを作成
      await this.cloudFunctionsService.createUserByAdmin({
        email,
        password: initialPassword,
        displayName,
        companyKey,
        userId,
        role: 'owner',
        initialPassword,
      });
      alert('オーナーユーザーを追加しました');
      this.router.navigate(['/company-owner']);
    } catch (e: any) {
      this.errorMsg = e.message || '登録に失敗しました';
    } finally {
      this.loading = false;
    }
  }
}
