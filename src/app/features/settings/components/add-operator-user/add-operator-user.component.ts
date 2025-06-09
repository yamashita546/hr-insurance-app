import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppUser } from '../../../../core/models/user.model';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { CloudFunctionsService } from '../../../../core/services/cloud.functions.service';

@Component({
  selector: 'app-add-operator-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-operator-user.component.html',
  styleUrl: './add-operator-user.component.css'
})
export class AddOperatorUserComponent implements OnInit {
  operatorForm: FormGroup;
  errorMsg: string = '';
  loading: boolean = false;
  companyId: string = '';
  companyName: string = '';
  companyKey: string = '';

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private router: Router,
    private firestoreService: FirestoreService,
    private auth: Auth,
    private userCompanyService: UserCompanyService,
    private cloudFunctionsService: CloudFunctionsService
  ) {
    this.operatorForm = this.fb.group({
      userId: ['', [Validators.required]],
      displayName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      initialPassword: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit() {
    this.userCompanyService.company$.subscribe(company => {
      if (company) {
        this.companyId = company.companyId;
        this.companyName = company.name;
        this.companyKey = company.companyKey;
      }
    });
  }

  async onSubmit() {
    this.errorMsg = '';
    if (this.operatorForm.invalid) return;
    this.loading = true;
    const { userId, displayName, email, initialPassword } = this.operatorForm.value;
    try {
      // Cloud Functions経由でオペレーターを作成
      await this.cloudFunctionsService.createUserByAdmin({
        email,
        password: initialPassword,
        displayName,
        companyKey: this.companyKey,
        userId,
        initialPassword,
        role: 'operator',
      });
      alert('実務担当者を追加しました');
      this.router.navigate(['/manage-operator']);
    } catch (e: any) {
      this.errorMsg = e.message || '登録に失敗しました';
    } finally {
      this.loading = false;
    }
  }
}
