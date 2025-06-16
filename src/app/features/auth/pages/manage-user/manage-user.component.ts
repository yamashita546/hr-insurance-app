import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { Auth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from '@angular/fire/auth';


@Component({
  selector: 'app-manage-user',
  standalone: true,
  imports: [CommonModule, FormsModule ],
  templateUrl: './manage-user.component.html',
  styleUrl: './manage-user.component.css'
})
export class ManageUserComponent implements OnInit {
  companyId: string = '';
  companyName: string = '';
  userName: string = '';
  email: string = '';
  role: string = '';
  isGoogleLinked: boolean = false;
  uid: string = '';
  showPasswordInput = false;
  inputPassword = '';
  showPasswordModal = false;
  currentPassword = '';
  newPassword = '';

  constructor(private userCompanyService: UserCompanyService, private authService: AuthService, private auth: Auth) {}

  ngOnInit(): void {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyId), take(1))
      .subscribe(company => {
        this.companyId = company!.companyId;
        this.companyName = company!.name;
      });
    this.userCompanyService.user$
      .pipe(filter(user => !!user && !!user.uid), take(1))
      .subscribe(user => {
        this.userName = user!.displayName || '';
        this.email = user!.email || '';
        this.role = user!.role || '';
        this.isGoogleLinked = !!user!.isGoogleLinked;
        this.uid = user!.uid;
      });
  }

  async onLinkGoogle() {
    const password = prompt('現在のパスワードを入力してください');
    if (!password) return;
    try {
      await this.authService.linkGoogleWithPassword(this.email, password);
      alert('Google認証が有効になりました');
      this.isGoogleLinked = true;
    } catch (e: any) {
      alert(e.message || 'Google認証のリンクに失敗しました');
    }
  }

  async onLinkGoogleWithPassword() {
    if (!this.inputPassword) {
      alert('パスワードを入力してください');
      return;
    }
    try {
      await this.authService.linkGoogleWithPassword(this.email, this.inputPassword);
      alert('Google認証が有効になりました');
      this.isGoogleLinked = true;
      this.showPasswordInput = false;
      this.inputPassword = '';
    } catch (e: any) {
      alert(e.message || 'Google認証のリンクに失敗しました');
    }
  }

  async onChangePassword() {
    if (!this.currentPassword || !this.newPassword) {
      alert('両方のパスワードを入力してください');
      return;
    }
    try {
      const user = this.auth.currentUser;
      if (!user || !user.email) throw new Error('ユーザー情報が取得できません');
      const credential = EmailAuthProvider.credential(user.email, this.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, this.newPassword);
      alert('パスワードを変更しました');
      this.showPasswordModal = false;
      this.currentPassword = '';
      this.newPassword = '';
    } catch (e: any) {
      alert(e.message || 'パスワード変更に失敗しました');
    }
  }
}
