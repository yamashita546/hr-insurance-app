import { Component, OnInit } from '@angular/core';
// 必要なサービスを仮インポート
// import { FirestoreService } from 'src/app/core/services/firestore.service';

@Component({
  selector: 'app-insurance-detail',
  standalone: true,
  imports: [],
  templateUrl: './insurance-detail.component.html',
  styleUrl: './insurance-detail.component.css'
})
export class InsuranceDetailComponent implements OnInit {
  employees: any[] = [];
  selectedEmployeeId: string = '';
  employeeInfo: any = null;
  currentInsuranceInfo: any = null;
  insuranceHistoryList: any[] = [];

  // constructor(private firestoreService: FirestoreService) {}

  async ngOnInit() {
    // this.employees = await this.firestoreService.getEmployeesByCompanyKey(...);
    // if (this.employees.length > 0) {
    //   this.selectedEmployeeId = this.employees[0].employeeId;
    //   this.onEmployeeChange();
    // }
  }

  async onEmployeeChange() {
    // this.employeeInfo = await this.firestoreService.getEmployeeDetail(this.selectedEmployeeId);
    // this.currentInsuranceInfo = await this.firestoreService.getCurrentInsuranceInfo(this.selectedEmployeeId);
    // this.insuranceHistoryList = await this.firestoreService.getInsuranceHistory(this.selectedEmployeeId);
  }
}
