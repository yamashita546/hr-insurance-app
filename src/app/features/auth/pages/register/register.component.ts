import { Component } from '@angular/core';
import { Auth, signInWithEmailAndPassword, updatePassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, deleteDoc, Timestamp } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      tempPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  async onRegister() {
    if (this.registerForm.invalid) return;
    const { email, tempPassword, newPassword } = this.registerForm.value;
    try {
      // 1. 仮パスワードでサインイン
      const cred = await signInWithEmailAndPassword(this.auth, email, tempPassword);
      // 2. 本パスワードに変更
      await updatePassword(cred.user, newPassword);

      // 3. Firestoreのusersコレクションで「メールアドレスID」のドキュメントを取得
      const oldDocRef = doc(this.firestore, 'users', email);
      const oldSnap = await getDoc(oldDocRef);

      if (oldSnap.exists()) {
        const data = oldSnap.data();
        await setDoc(doc(this.firestore, 'users', cred.user.uid), {
          ...data,
          uid: cred.user.uid,
          isRegistered: true,
          updatedAt: Timestamp.now()
        });
        await deleteDoc(oldDocRef);
      } else {
        // 旧ドキュメントがなければエラー
        alert('仮登録情報が見つかりません。管理者にお問い合わせください。');
        return;
      }

      this.router.navigate(['/']); // ログイン後の画面へ
    } catch (e: any) {
      alert(e.message || '登録に失敗しました');
    }
  }
}
