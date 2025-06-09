import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Firestore } from '@angular/fire/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppUser } from '../../../../core/models/user.model';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { Company } from '../../../../core/models/company.model';

@Component({
  selector: 'app-edit-owner-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-owner-user.component.html',
  styleUrl: './edit-owner-user.component.css'
})
export class EditOwnerUserComponent {
  ownerForm: FormGroup;
  errorMsg: string = '';
  loading: boolean = false;
  companies: Company[] = [];
  uid: string = '';
  isRegistered: boolean = false;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private router: Router,
    private route: ActivatedRoute,
    private firestoreService: FirestoreService
  ) {
    this.ownerForm = this.fb.group({
      companyKey: [{ value: '', disabled: true }, [Validators.required]],
      userId: [{ value: '', disabled: true }, [Validators.required]],
      displayName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      initialPassword: ['']
    });
    this.loadCompaniesAndUser();
  }

  async loadCompaniesAndUser() {
    this.companies = await new Promise<Company[]>(resolve => {
      this.firestoreService.getCompanies().subscribe(companies => resolve(companies));
    });
    this.uid = this.route.snapshot.paramMap.get('uid') || '';
    if (this.uid) {
      const user = await this.firestoreService.getAppUserByUid(this.uid);
      if (user) {
        this.isRegistered = !!user.isRegistered;
        this.ownerForm.patchValue({
          companyKey: user.companyKey,
          userId: user.userId,
          displayName: user.displayName,
          email: user.email,
          initialPassword: user.initialPassword || ''
        });
        const pwCtrl = this.ownerForm.get('initialPassword');
        if (this.isRegistered) {
          pwCtrl?.disable();
        } else {
          pwCtrl?.enable();
        }
      }
    }
  }

  async onSubmit() {
    this.errorMsg = '';
    if (this.ownerForm.invalid) return;
    this.loading = true;
    const { displayName, email, initialPassword } = this.ownerForm.getRawValue();
    try {
      const updateData: any = { displayName, email };
      if (!this.isRegistered) {
        updateData.initialPassword = initialPassword;
      }
      await this.firestoreService.updateUser(this.uid, updateData);
      alert('オーナーユーザー情報を更新しました');
      this.router.navigate(['/company-owner']);
    } catch (e: any) {
      this.errorMsg = e.message || '更新に失敗しました';
    } finally {
      this.loading = false;
    }
  }
}
