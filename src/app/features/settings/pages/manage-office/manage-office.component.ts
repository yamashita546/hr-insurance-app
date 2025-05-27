import { Component } from '@angular/core';
import { Office } from '../../../../core/models/company.model';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company } from '../../../../core/models/company.model';
import { MatDialog } from '@angular/material/dialog';
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
    this.offices = await this.firestoreService.getOffices(this.company.companyId);
  }

  openAddOfficeDialog() {
    const dialogRef = this.dialog.open(AddOfficeComponent, { width: '500px' });
    dialogRef.componentInstance.saved.subscribe(async (office: Office) => {
      if (!this.company) return;
      await this.firestoreService.addOffice(this.company.companyId, office, this.company.displayId);
      dialogRef.close();
      await this.fetchOffices();
    });
    dialogRef.componentInstance.cancelled.subscribe(() => dialogRef.close());
  }

  openEditOfficeDialog() {
    if (this.selectedOffices.length !== 1) {
      alert('編集は1件のみ選択してください');
      return;
    }
    const targetOffice = this.selectedOffices[0];
    const dialogRef = this.dialog.open(EditOfficeComponent, {
      data: { ...targetOffice }
    });
    dialogRef.componentInstance.saved?.subscribe((updated: Office) => {
      // 編集内容をリストに反映
      const idx = this.offices.findIndex(o => o.id === updated.id);
      if (idx !== -1) {
        this.offices[idx] = { ...updated };
      }
      dialogRef.close();
    });
    dialogRef.componentInstance.cancelled?.subscribe(() => dialogRef.close());
  }

  onDeleteOffice() {
    if (this.selectedOffices.length === 0) return;
    if (!window.confirm('選択した事業所を削除しますか？')) return;
    this.offices = this.offices.filter(b => !this.selectedOffices.includes(b));
    this.selectedOffices = [];
  }

  applyChanges() {
    alert('変更を適用しました（今後Firestore連携）');
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

getPrefectureName(code: string): string {
  const type = PREFECTURES.find(t => t.code === code);
  return type ? type.name : code;
}

getInsuranceTypeName(code: string): string {
  const type = INSURANCE_TYPES.find(t => t.code === code);
  return type ? type.name : code;
} 

getIndustryClassificationName(code: string): string {
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
