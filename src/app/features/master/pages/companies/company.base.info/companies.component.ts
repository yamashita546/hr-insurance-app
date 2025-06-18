import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddCompanyComponent } from '../../../dialogs/add-company/add-company.component';
import { EditCompanyComponent } from '../../../dialogs/edit-company/edit-company.component';
import { FirestoreService } from '../../../../../core/services/firestore.service';
import { CommonModule } from '@angular/common';
import { PREFECTURES } from '../../../../../core/models/prefecture.model';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css'
})
export class CompaniesComponent {
  companies: any[] = [];
  originalCompanies: any[] = [];
  selectedCompanies: any[] = [];
  dialogRef: MatDialogRef<any> | null = null;
  prefectures = PREFECTURES;
  constructor(private dialog: MatDialog, private firestoreService: FirestoreService) {}

  getPrefectureName(code: string): string {
    const pref = this.prefectures.find(p => p.code === code);
    return pref ? pref.name : '';
  }

  isSelected(company: any): boolean {
    return this.selectedCompanies.some(c => c.companyId === company.companyId);
  }

  toggleSelection(company: any, event: any) {
    if (event.target.checked) {
      this.selectedCompanies.push(company);
    } else {
      this.selectedCompanies = this.selectedCompanies.filter(c => c.companyId !== company.companyId);
    }
  }

  openAddCompanyDialog() {
    if (this.dialogRef) return;
    this.dialogRef = this.dialog.open(AddCompanyComponent, {
      width: '500px',
      height: '500px'
    });
    this.dialogRef.afterClosed().subscribe(() => {
      this.dialogRef = null;
      this.getCompanies();
    });
  }

  openEditCompanyDialog() {
    if (this.dialogRef) return;
    if (this.selectedCompanies.length === 0) return;
    if (this.selectedCompanies.length > 1) {
      alert('編集は1件ずつ選択してください');
      return;
    }
    const company = this.selectedCompanies[0];
    this.dialogRef = this.dialog.open(EditCompanyComponent, {
      width: '500px',
      height: '90vh',
      data: { ...company },
      disableClose: true
    });
    const instance = this.dialogRef.componentInstance;
    if (instance) {
      instance.data = { ...company };
      instance.saved.subscribe((updated: any) => {
        const idx = this.companies.findIndex(c => c.companyId === updated.companyId);
        if (idx !== -1) {
          this.companies[idx] = { ...updated };
        }
        this.dialogRef?.close();
        this.dialogRef = null;
      });
      instance.cancelled.subscribe(() => {
        this.dialogRef?.close();
        this.dialogRef = null;
      });
    }
  }

  ngOnInit() {
    this.getCompanies();
  }

  getCompanies() {
    this.firestoreService.getCompanies().subscribe((companies) => {
      this.companies = companies;
      this.originalCompanies = companies.map(c => ({ ...c }));
      this.selectedCompanies = [];
    });
  }

  async applyChanges() {
    // 差分のみ抽出
    const updatedCompanies = this.companies.filter(company => {
      const original = this.originalCompanies.find(c => c.companyId === company.companyId);
      return !original || Object.keys(company).some(key => JSON.stringify(company[key]) !== JSON.stringify(original[key]));
    });
    if (updatedCompanies.length === 0) {
      alert('変更はありません');
      return;
    }
    for (const company of updatedCompanies) {
      await this.firestoreService.updateCompany(company); // 上書き保存
    }
    alert('変更を適用しました');
    this.getCompanies();
  }

  resetChanges() {
    if (!window.confirm('変更をリセットしてよろしいですか？')) return;
    this.getCompanies();
  }

  isChanged(company: any): boolean {
    const original = this.originalCompanies.find(c => c.companyId === company.companyId);
    if (!original) return false;
    // 主要な項目で差分があれば変更とみなす
    return (
      company.corporateNumber !== original.corporateNumber ||
      company.name !== original.name ||
      company.industry !== original.industry ||
      company.companyOwner !== original.companyOwner ||
      JSON.stringify(company.headOfficeAddress) !== JSON.stringify(original.headOfficeAddress) ||
      company.establishmentDate !== original.establishmentDate ||
      company.isActive !== original.isActive
    );
  }

  isChangedCorporateNumber(company: any): boolean {
    const original = this.originalCompanies.find(c => c.companyId === company.companyId);
    return original ? company.corporateNumber !== original.corporateNumber : false;
  }

  isChangedName(company: any): boolean {
    const original = this.originalCompanies.find(c => c.companyId === company.companyId);
    return original ? company.name !== original.name : false;
  }

  isChangedIndustry(company: any): boolean {
    const original = this.originalCompanies.find(c => c.companyId === company.companyId);
    return original ? company.industry !== original.industry : false;
  }

  isChangedCompanyOwner(company: any): boolean {
    const original = this.originalCompanies.find(c => c.companyId === company.companyId);
    return original ? company.companyOwner !== original.companyOwner : false;
  }

  isChangedHeadOfficeAddress(company: any): boolean {
      const original = this.originalCompanies.find(c => c.companyId === company.companyId);
    if (!original) return false;
    const addr = company.headOfficeAddress || {};
    const origAddr = original.headOfficeAddress || {};
    return (
      (addr.postalCode || '') !== (origAddr.postalCode || '') ||
      (addr.prefecture || '') !== (origAddr.prefecture || '') ||
      (addr.city || '') !== (origAddr.city || '') ||
      (addr.town || '') !== (origAddr.town || '') ||
      (addr.streetAddress || '') !== (origAddr.streetAddress || '') ||
      (addr.buildingName || '') !== (origAddr.buildingName || '')
    );
  }

  isChangedEstablishmentDate(company: any): boolean {
    const original = this.originalCompanies.find(c => c.companyId === company.companyId);
    return original ? company.establishmentDate !== original.establishmentDate : false;
  }

  isChangedIsActive(company: any): boolean {
    const original = this.originalCompanies.find(c => c.companyId === company.companyId);
    return original ? company.isActive !== original.isActive : false;
  }

  onToggleActiveCompanies() {
    if (this.selectedCompanies.length === 0) {
      alert('対象の企業を選択してください');
      return;
    }
    let changed = false;
    this.selectedCompanies.forEach(selected => {
      const idx = this.companies.findIndex(c => c.companyId === selected.companyId);
      if (idx !== -1) {
        const company = this.companies[idx];
        const action = company.isActive ? '無効' : '有効';
        if (window.confirm(`${company.name}を${action}にしますか？`)) {
          this.companies[idx] = {
            ...company,
            isActive: !company.isActive
          };
          changed = true;
        }
      }
    });
    if (changed) {
      alert('確認のうえ「変更を適用」を押してください。');
    }
  }
}
