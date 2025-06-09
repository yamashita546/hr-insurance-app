import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Firestore } from '@angular/fire/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppUser } from '../../../../core/models/user.model';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { CloudFunctionsService } from '../../../../core/services/cloud.functions.service';

@Component({
  selector: 'app-edit-operator-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-operator-user.component.html',
  styleUrl: './edit-operator-user.component.css'
})
export class EditOperatorUserComponent {
  operatorForm: FormGroup;
  errorMsg: string = '';
  loading: boolean = false;
  uid: string = '';
  isRegistered: boolean = false;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private router: Router,
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private cloudFunctionsService: CloudFunctionsService
  ) {
    this.operatorForm = this.fb.group({
      userId: [{ value: '', disabled: true }, [Validators.required]],
      displayName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      initialPassword: ['']
    });
    this.loadUser();
  }

  async loadUser() {
    this.uid = this.route.snapshot.paramMap.get('uid') || '';
    if (this.uid) {
      const user = await this.firestoreService.getAppUserByUid(this.uid);
      if (user) {
        this.isRegistered = !!user.isRegistered;
        this.operatorForm.patchValue({
          userId: user.userId,
          displayName: user.displayName,
          email: user.email,
          initialPassword: user.initialPassword || ''
        });
        const pwCtrl = this.operatorForm.get('initialPassword');
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
    if (this.operatorForm.invalid) return;
    this.loading = true;
    const { displayName, email, initialPassword } = this.operatorForm.getRawValue();
    try {
      const updateData: any = {
        uid: this.uid,
        displayName,
        email,
      };
      if (!this.isRegistered && this.operatorForm.get('initialPassword')?.dirty) {
        updateData.password = initialPassword;
      }
      await this.cloudFunctionsService.updateUserByAdmin(updateData);
      alert('実務担当者情報を更新しました');
      this.router.navigate(['/manage-operator']);
    } catch (e: any) {
      this.errorMsg = e.message || '更新に失敗しました';
    } finally {
      this.loading = false;
    }
  }
}
