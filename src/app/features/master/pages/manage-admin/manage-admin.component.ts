import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppUser } from '../../../../core/models/user.model';
import { DateTimestampPipe } from '../../../../core/pipe/date-timestamp.pipe';
import { Router , RouterModule} from '@angular/router';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manage-admin',
  standalone: true,
  imports: [CommonModule, DateTimestampPipe, RouterModule, FormsModule],
  templateUrl: './manage-admin.component.html',
  styleUrl: './manage-admin.component.css'
})
export class ManageAdminComponent implements OnInit {
  adminUsers: AppUser[] = [];
  readonly companyKey = 'VF9FRgVnVlAaBbSaeU2q';

  sortKey: keyof AppUser | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  editingUid: string | null = null;
  editUser: Partial<AppUser> = {};

  constructor(private firestoreService: FirestoreService, private router: Router) {}

  async ngOnInit() {
    this.adminUsers = await this.firestoreService.getAdminUsersByCompanyKey(this.companyKey);
  }

  onSort(key: keyof AppUser) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
    this.adminUsers = [...this.adminUsers].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];
      // 日付型はnumberに変換して比較
      if ((key === 'createdAt' || key === 'updatedAt')) {
        const aTime = aValue ? new Date(aValue as any).getTime() : 0;
        const bTime = bValue ? new Date(bValue as any).getTime() : 0;
        if (aTime < bTime) return this.sortDirection === 'asc' ? -1 : 1;
        if (aTime > bTime) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // onAddAdmin() {
  //   // 追加ダイアログやフォーム表示用
  //   alert('管理者ユーザー追加機能は未実装です');
  // }

  async onDeleteAdmin(user: AppUser) {
    if (confirm(`本当に「${user.displayName}」を削除してよろしいですか？`)) {
      await this.firestoreService.deleteUser(user.uid);
      this.adminUsers = this.adminUsers.filter(u => u.uid !== user.uid);
    }
  }

  onEditAdmin(user: AppUser) {
    this.router.navigate(['/edit-admin-user', user.uid]);
  }

  onCancelEdit() {
    this.editingUid = null;
    this.editUser = {};
  }

  async onSaveEdit(user: AppUser) {
    if (!this.editUser.displayName || !this.editUser.email) {
      alert('氏名とメールアドレスは必須です');
      return;
    }
    await this.firestoreService.updateUser(user.uid, {
      displayName: this.editUser.displayName,
      email: this.editUser.email
    });
    // ローカルリストも更新
    this.adminUsers = this.adminUsers.map(u =>
      u.uid === user.uid ? { ...u, displayName: this.editUser.displayName!, email: this.editUser.email! } : u
    );
    this.editingUid = null;
    this.editUser = {};
  }
}
