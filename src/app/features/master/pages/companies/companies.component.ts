import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
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
  constructor(private dialog: MatDialog, private firestoreService: FirestoreService) {}
  openAddCompanyDialog() {
    const dialogRef = this.dialog.open(AddCompanyComponent, {
      width: '500px',
      height: '500px'
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
