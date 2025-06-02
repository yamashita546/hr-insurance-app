import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Auth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from '@angular/fire/auth';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


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
    private router: Router
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
    const { email, password, companyKey } = this.loginForm.value;
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

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
