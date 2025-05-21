import { Component } from '@angular/core';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, deleteDoc } from '@angular/fire/firestore';
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
      password: ['', Validators.required]
    });
  }

  async onRegister() {
    if (this.registerForm.invalid) return;
    const { email, password } = this.registerForm.value;
    try {
      // 1. Firebase Authenticationにユーザー作成
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);
      const uid = cred.user.uid;

      // 2. Firestoreのusersコレクションで「メールアドレスID」のドキュメントを取得
      const oldDocRef = doc(this.firestore, 'users', email);
      const oldSnap = await getDoc(oldDocRef);

      if (oldSnap.exists()) {
        const data = oldSnap.data();
        // 3. UIDで新ドキュメント作成
        await setDoc(doc(this.firestore, 'users', uid), { ...data, uid });
        // 4. 古いドキュメント削除
        await deleteDoc(oldDocRef);
      } else {
        // 旧ドキュメントがなければ新規作成
        await setDoc(doc(this.firestore, 'users', uid), {
          email,
          uid,
          role: 'owner',
          // 必要な他のフィールド
        });
      }

      this.router.navigate(['/']); // ログイン後の画面へ
    } catch (e: any) {
      alert(e.message || '登録に失敗しました');
    }
  }
}
