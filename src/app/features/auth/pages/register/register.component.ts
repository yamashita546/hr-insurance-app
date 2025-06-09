import { Component, OnInit } from '@angular/core';
import { Auth, signInWithEmailAndPassword, updatePassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, deleteDoc, Timestamp, updateDoc } from '@angular/fire/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  message: string = '';

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      tempPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit() {
    const msg = this.route.snapshot.queryParamMap.get('msg');
    if (msg === 'first-login') {
      this.message = '初回ログインのため、パスワード変更が必要です。';
    }
  }

  async onRegister() {
    if (this.registerForm.invalid) return;
    const { email, tempPassword, newPassword } = this.registerForm.value;
    try {
      // 1. 仮パスワードでサインイン
      const cred = await signInWithEmailAndPassword(this.auth, email, tempPassword);
      // 2. 本パスワードに変更
      await updatePassword(cred.user, newPassword);

      // 3. Firestoreのusersコレクションでuidのドキュメントを取得・更新
      const userDocRef = doc(this.firestore, 'users', cred.user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        await updateDoc(userDocRef, {
          isRegistered: true,
          updatedAt: Timestamp.now()
        });
      } else {
        alert('ユーザー情報が見つかりません。管理者にお問い合わせください。');
        return;
      }

      alert('本登録が完了しました。ログインしてください。');
      this.router.navigate(['/login']);
    } catch (e: any) {
      if (e.code === 'auth/wrong-password') {
        alert('仮パスワードが正しくありません。');
      } else if (e.code === 'auth/user-not-found') {
        alert('ユーザーが見つかりません。');
      } else {
        alert(e.message || '登録に失敗しました');
      }
    }
  }
}
