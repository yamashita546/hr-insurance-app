import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Auth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, EmailAuthProvider, linkWithCredential } from '@angular/fire/auth';
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
        alert('初回ログインです。パスワード変更が必要です。');
        this.router.navigate(['/register'], { queryParams: { uid: cred.user.uid, msg: 'first-login' } });
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
      // isRegistered=false かつ isGoogleLinked=false の場合はリンク処理
      if (!appUser.isRegistered && !appUser.isGoogleLinked) {
        const password = prompt('初回登録のため、仮パスワードを入力してください。\n（Google認証とメール認証を連携します）');
        if (!password) {
          alert('パスワードが入力されませんでした');
          await this.authService.logout();
          return;
        }
        try {
          const emailCred = EmailAuthProvider.credential(cred.user.email!, password);
          await linkWithCredential(cred.user, emailCred);
          await this.authService.setGoogleLinked(cred.user.uid);
          alert('Google認証とメール認証の連携が完了しました。パスワード変更に進みます。');
          this.router.navigate(['/register'], { queryParams: { uid: cred.user.uid, msg: 'first-login' } });
          return;
        } catch (e: any) {
          alert(e.message || 'Google認証とメール認証の連携に失敗しました');
          await this.authService.logout();
          return;
        }
      }
      if (!appUser.isRegistered) {
        alert('初回ログインです。パスワード変更が必要です。');
        this.router.navigate(['/register'], { queryParams: { uid: cred.user.uid, msg: 'first-login' } });
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
