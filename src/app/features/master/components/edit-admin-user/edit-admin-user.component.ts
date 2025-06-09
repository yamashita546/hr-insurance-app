import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { AppUser } from '../../../../core/models/user.model';
import { RouterModule } from '@angular/router';
import { Auth, updateEmail, updatePassword } from '@angular/fire/auth';

@Component({
  selector: 'app-edit-admin-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './edit-admin-user.component.html',
  styleUrl: './edit-admin-user.component.css'
})
export class EditAdminUserComponent {
  editForm: FormGroup;
  errorMsg: string = '';
  loading: boolean = false;
  uid: string = '';
  isRegistered: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private firestoreService: FirestoreService,
    private auth: Auth
  ) {
    this.editForm = this.fb.group({
      userId: ['', [Validators.required]],
      displayName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      initialPassword: [{ value: '', disabled: false }]
    });
  }

  async ngOnInit() {
    this.uid = this.route.snapshot.paramMap.get('uid') || '';
    if (!this.uid) {
      this.errorMsg = 'ユーザーIDが不正です';
      return;
    }
    this.loading = true;
    const user = await this.firestoreService.getAdminUsersByCompanyKey('VF9FRgVnVlAaBbSaeU2q');
    const target = user.find(u => u.uid === this.uid);
    if (!target) {
      this.errorMsg = 'ユーザーが見つかりません';
      this.loading = false;
      return;
    }
    this.isRegistered = !!target.isRegistered;
    this.editForm.patchValue({
      userId: target.userId,
      displayName: target.displayName,
      email: target.email,
      initialPassword: target.initialPassword || ''
    });
    if (this.isRegistered) {
      this.editForm.get('initialPassword')?.disable();
    } else {
      this.editForm.get('initialPassword')?.enable();
    }
    this.loading = false;
  }

  async onSubmit() {
    this.errorMsg = '';
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    try {
      const updateData: any = {
        userId: this.editForm.value.userId,
        displayName: this.editForm.value.displayName,
        email: this.editForm.value.email
      };
      // Firebase Authのユーザー情報も更新
      const user = this.auth.currentUser;
      if (user) {
        if (user.email !== this.editForm.value.email) {
          await updateEmail(user, this.editForm.value.email);
        }
        if (!this.isRegistered && this.editForm.get('initialPassword')?.dirty) {
          await updatePassword(user, this.editForm.get('initialPassword')?.value);
          updateData.initialPassword = this.editForm.get('initialPassword')?.value;
        }
      }
      await this.firestoreService.updateUser(this.uid, updateData);
      alert('管理者ユーザー情報を更新しました');
      this.router.navigate(['/manage-admin']);
    } catch (e: any) {
      this.errorMsg = e.message || '更新に失敗しました';
    } finally {
      this.loading = false;
    }
  }

  onCancel() {
    this.router.navigate(['/manage-admin']);
  }
}
