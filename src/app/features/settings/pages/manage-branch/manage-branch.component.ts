import { Component } from '@angular/core';
import { Office } from '../../../../core/models/company.model';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company } from '../../../../core/models/company.model';
import { MatDialog } from '@angular/material/dialog';
import { AddBranchComponent } from '../../dialog/add-branch/add-branch.component';
import { Firestore, collection, addDoc, getDocs } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manage-branch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-branch.component.html',
  styleUrl: './manage-branch.component.css'
})
export class ManageBranchComponent {
  branches: Office[] = [];
  selectedBranches: Office[] = [];
  company: Company | null = null;

  constructor(
    private userCompanyService: UserCompanyService,
    private dialog: MatDialog,
    private firestore: Firestore
  ) {
    this.userCompanyService.company$.subscribe(company => {
      this.company = company;
      this.fetchBranches();
    });
  }

  async fetchBranches() {
    if (!this.company) return;
    const officesCol = collection(this.firestore, `companies/${this.company.companyId}/offices`);
    const snap = await getDocs(officesCol);
    this.branches = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Office));
  }

  openAddBranchDialog() {
    const dialogRef = this.dialog.open(AddBranchComponent, { width: '500px' });
    dialogRef.componentInstance.saved.subscribe(async (office: Office) => {
      if (!this.company) return;
      const officesCol = collection(this.firestore, `companies/${this.company.companyId}/offices`);
      await addDoc(officesCol, office);
      dialogRef.close();
      await this.fetchBranches();
    });
    dialogRef.componentInstance.cancelled.subscribe(() => dialogRef.close());
  }

  openEditBranchDialog() {
    // TODO: ダイアログを開いて編集処理
    alert('編集ダイアログを開く（今後実装）');
  }

  onDeleteBranch() {
    if (this.selectedBranches.length === 0) return;
    if (!window.confirm('選択した支社を削除しますか？')) return;
    this.branches = this.branches.filter(b => !this.selectedBranches.includes(b));
    this.selectedBranches = [];
  }

  applyChanges() {
    alert('変更を適用しました（今後Firestore連携）');
  }

  resetChanges() {
    if (!window.confirm('変更をリセットしてよろしいですか？')) return;
    this.fetchBranches();
  }
}
