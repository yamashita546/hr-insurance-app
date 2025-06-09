import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Auth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from '@angular/fire/auth';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  showCompanyKey = false;
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      companyKey: [''],
      password: ['', Validators.required],
      remember: [false]
    });
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;
    const { email, password } = this.loginForm.value;
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      // Firestore usersコレクションチェック
      const appUser = await this.authService.getAppUserByUid(cred.user.uid);
      if (!appUser) {
        alert('このユーザーは登録されていません');
        await this.authService.logout();
        return;
      }
      if (!appUser.isRegistered) {
        this.router.navigate(['/register'], { queryParams: { uid: cred.user.uid } });
        return;
      }
      this.router.navigate(['/']);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async loginWithGoogle() {
    try {
      const cred = await signInWithPopup(this.auth, new GoogleAuthProvider());
      // emailでusersコレクションを検索
      const appUser = await this.authService.getAppUserByEmail(cred.user.email!);
      if (!appUser) {
        alert('このGoogleアカウントは未登録です');
        await this.authService.logout();
        return;
      }
      // uidが異なる場合はFirestoreのAppUserのuidをGoogleのuidに更新
      if (appUser.uid !== cred.user.uid) {
        await this.authService.updateUserUid(appUser.uid, cred.user.uid);
      }
      if (!appUser.isRegistered) {
        this.router.navigate(['/register'], { queryParams: { uid: cred.user.uid } });
        return;
      }
      this.router.navigate(['/']);
    } catch (err: any) {
      alert(err.message);
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
