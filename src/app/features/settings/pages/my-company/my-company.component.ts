import { Component } from '@angular/core';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { PREFECTURES, Prefecture } from '../../../../core/models/prefecture.model';
import { Observable, take } from 'rxjs';
import { AppUser } from '../../../../core/models/user.model';
import { Company } from '../../../../core/models/company.model';
import { CommonModule } from '@angular/common';
import { DiffUtil } from '../../../../core/utils/diff-util';
import { MatDialog } from '@angular/material/dialog';
import { EditMyCompanyComponent } from '../../dialog/edit-my-company/edit-my-company.component';

@Component({
  selector: 'app-my-company',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-company.component.html',
  styleUrl: './my-company.component.css'
})
export class MyCompanyComponent {
  user$: Observable<AppUser | null>;
  company$: Observable<Company | null>;
  originalCompany: Company | null = null;
  editedCompany: Company | null = null;

  constructor(private userCompanyService: UserCompanyService, private dialog: MatDialog) {
    this.user$ = this.userCompanyService.user$;
    this.company$ = this.userCompanyService.company$;
    this.company$.subscribe(company => {
      this.originalCompany = company;
      if (!this.editedCompany) {
        this.editedCompany = company ? { ...company } : null;
      }
    });
  }

  openEditDialog() {
    if (!this.editedCompany) return;
    const dialogRef = this.dialog.open(EditMyCompanyComponent, {
      data: { ...this.editedCompany }
    });
    dialogRef.componentInstance.saved.subscribe((updated: Company) => {
      this.editedCompany = updated;
      dialogRef.close();
    });
    dialogRef.componentInstance.cancelled.subscribe(() => dialogRef.close());
  }

  applyEdit() {
    if (!this.editedCompany) return;
    this.userCompanyService.updateCompany(this.editedCompany);
    this.originalCompany = { ...this.editedCompany };
    alert('会社情報を更新しました');
  }

  isChanged(key: keyof Company): boolean {
    return DiffUtil.isChanged(this.originalCompany, this.editedCompany, key);
  }

  isChangedDeep(path: string): boolean {
    return DiffUtil.isChangedDeep(this.originalCompany, this.editedCompany, path);
  }

  getPrefectureName(pref?: string | Prefecture): string {
    if (!pref) return '';
    if (typeof pref === 'object' && 'name' in pref) {
      return pref.name;
    }
    const found = PREFECTURES.find(p => p.code === pref);
    return found ? found.name : (typeof pref === 'string' ? pref : '');
  }

  resetEdit() {
    if (!window.confirm('編集内容は保存されていません。変更をリセットしてよろしいですか？')) return;
    if (this.originalCompany) {
      this.editedCompany = { ...this.originalCompany };
    }
  }
}

