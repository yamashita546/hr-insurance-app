import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from '@angular/fire/auth';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  showCompanyId = false;
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      companyId: [''],
      password: ['', Validators.required],
      remember: [false]
    });
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;
    const { email, password } = this.loginForm.value;
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/']);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async loginWithGoogle() {
    try {
      await signInWithPopup(this.auth, new GoogleAuthProvider());
      this.router.navigate(['/']);
    } catch (err: any) {
      alert(err.message);
    }
  }
}
