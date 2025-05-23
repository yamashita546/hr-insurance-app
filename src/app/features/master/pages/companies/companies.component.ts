import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddCompanyComponent } from '../../dialogs/add-company/add-company.component';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css'
})
export class CompaniesComponent {
  companies: any[] = [];
  dialogRef: MatDialogRef<any> | null = null;
  constructor(private dialog: MatDialog, private firestoreService: FirestoreService) {}
  openAddCompanyDialog() {
    if (this.dialogRef) return;
    this.dialogRef = this.dialog.open(AddCompanyComponent, {
      width: '500px',
      height: '500px'
    });
    this.dialogRef.afterClosed().subscribe(() => {
      this.dialogRef = null;
    });
  }

  ngOnInit() {
    this.getCompanies();
  }

  getCompanies() {
    this.firestoreService.getCompanies().subscribe((companies) => {
      this.companies = companies;
    });
  }
}
