import { Component } from '@angular/core';
import { Office } from '../../../../core/models/company.model';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company } from '../../../../core/models/company.model';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddOfficeComponent } from '../../dialog/add-office/add-office.component';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { CommonModule } from '@angular/common';
import { INSURANCE_TYPES } from '../../../../core/models/insurance-type';
import { INDUSTRY_CLASSIFICATIONS } from '../../../../core/models/industry-classification.model';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { EditOfficeComponent } from '../../dialog/edit-office/edit-office.component';

@Component({
  selector: 'app-manage-office',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-office.component.html',
  styleUrl: './manage-office.component.css'
})
export class ManageOfficeComponent {
  offices: Office[] = [];
  selectedOffices: Office[] = [];
  company: Company | null = null;
  dialogRef: MatDialogRef<any> | null = null;
  originalOffices: Office[] = [];

  constructor(
    private userCompanyService: UserCompanyService,
    private dialog: MatDialog,
    private firestoreService: FirestoreService
  ) {
    this.userCompanyService.company$.subscribe(company => {
      this.company = company;
      this.fetchOffices();
    });
  }

  async fetchOffices() {
    if (!this.company) return;
    const allOffices = await this.firestoreService.getOffices(this.company.companyKey);
    this.offices = allOffices.filter(o => o.isActive !== false);
    this.originalOffices = this.offices.map(o => ({ ...o }));
  }

  openAddOfficeDialog() {
    if (this.dialogRef) return;
    this.dialogRef = this.dialog.open(AddOfficeComponent, { width: '500px', data: { offices: this.offices } });
    this.dialogRef.componentInstance.saved.subscribe(async (office: Office) => {
      if (!this.company) return;
      await this.firestoreService.addOffice(this.company.companyKey, office, this.company.companyId);
      this.dialogRef?.close();
      this.dialogRef = null;
      await this.fetchOffices();
      this.selectedOffices = [];
    });
    this.dialogRef.componentInstance.cancelled.subscribe(() => {
      this.dialogRef?.close();
      this.dialogRef = null;
      this.selectedOffices = [];
    });
    this.dialogRef.afterClosed().subscribe(() => {
      this.dialogRef = null;
    });
  }

  openEditOfficeDialog() {
    if (this.selectedOffices.length !== 1) {
      alert('編集は1件のみ選択してください');
      return;
    }
    if (this.dialogRef) return;
    const targetOffice = this.selectedOffices[0];
    this.dialogRef = this.dialog.open(EditOfficeComponent, {
      data: { ...targetOffice, offices: this.offices }
    });
    this.dialogRef.componentInstance.dialogRef = this.dialogRef;
    this.dialogRef.componentInstance.saved?.subscribe((updated: Office) => {
      const idx = this.offices.findIndex(o => o.id === updated.id);
      if (idx !== -1) {
        this.offices[idx] = { ...updated };
      }
      this.dialogRef?.close();
      this.dialogRef = null;
      this.selectedOffices = [];
    });
    this.dialogRef.componentInstance.cancelled?.subscribe(() => {
      this.dialogRef?.close();
      this.dialogRef = null;
      this.selectedOffices = [];
    });
    this.dialogRef.afterClosed().subscribe(() => {
      this.dialogRef = null;
    });
  }

  onDeleteOffice() {
    if (this.selectedOffices.length === 0) return;
    if (!window.confirm('選択した事業所を削除しますか？')) return;
    this.selectedOffices.forEach(office => {
      office.isActive = false;
    });
    this.selectedOffices = [];
  }

  async applyChanges() {
    if (!this.company) return;
    await this.firestoreService.updateAllOffices(this.company.companyKey, this.offices);
    alert('変更をFirestoreに保存しました');
    await this.fetchOffices();
  }

  resetChanges() {
    if (!window.confirm('変更をリセットしてよろしいですか？')) return;
    this.fetchOffices();
  }

  onSelectOffice(office: Office, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedOffices.includes(office)) {
        this.selectedOffices.push(office);
      }
    } else {
      this.selectedOffices = this.selectedOffices.filter(b => b !== office);
    }
  }

  isCellChanged(office: Office, field: string): boolean {
    const orig = this.originalOffices.find(o => o.id === office.id);
    if (!orig) return true; // 新規追加
    const get = (obj: any, path: string) => path.split('.').reduce((o, k) => o?.[k], obj);
    return get(office, field) !== get(orig, field);
  }

  getPrefectureName(code: string): string {
    const type = PREFECTURES.find(t => t.code === code);
    return type ? type.name : code;
  }

  getInsuranceTypeName(code: string): string {
    const type = INSURANCE_TYPES.find(t => t.code === code);
    return type ? type.name : code;
  }

  getIndustryClassificationName(codeOrObj: string | { code?: string }): string {
    let code = '';
    if (typeof codeOrObj === 'string') {
      code = codeOrObj;
    } else if (codeOrObj && typeof codeOrObj === 'object' && 'code' in codeOrObj) {
      code = codeOrObj.code || '';
    }
    const type = INDUSTRY_CLASSIFICATIONS.find(t => t.code === code);
    return type ? type.name : code;
  }

  getIndustryClassificationId(code: string): string {
    const type = INDUSTRY_CLASSIFICATIONS.find(t => t.name === code);
    return type ? type.code : code;
  }

  getInsurancePrefectureName(code: string): string {
    const type = PREFECTURES.find(t => t.code === code);
    return type ? type.name : code;
  }
}
