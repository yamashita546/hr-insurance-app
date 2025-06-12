import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { filter, take } from 'rxjs/operators';
import { PREFECTURES } from '../../../../core/models/prefecture.model';

@Component({
  selector: 'app-insurance-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './insurance-detail.component.html',
  styleUrl: './insurance-detail.component.css'
})
export class InsuranceDetailComponent implements OnInit {
  employees: any[] = [];
  selectedEmployeeId: string = '';
  employeeInfo: any = null;
  currentInsuranceInfo: any = null;
  insuranceHistoryList: any[] = [];
  companyKey: string = '';
  offices: any[] = [];
  insuranceRates: any[] = [];
  salaryCalculations: any[] = [];
  bonusCalculations: any[] = [];

  constructor(
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService
  ) {}

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyKey), take(1))
      .subscribe(async company => {
        this.companyKey = company!.companyKey;
        this.offices = await this.firestoreService.getOffices(this.companyKey);
        this.employees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey);
        this.insuranceRates = (await this.firestoreService.getInsuranceRates().toPromise()) || [];
        console.log('取得したinsuranceRates:', this.insuranceRates);
        this.salaryCalculations = await this.firestoreService.getInsuranceSalaryCalculationsByCompanyKey(this.companyKey);
        console.log('取得したsalaryCalculations:', this.salaryCalculations);
        this.bonusCalculations = await this.firestoreService.getInsuranceBonusCalculationsByCompanyKey(this.companyKey);
        console.log('取得したbonusCalculations:', this.bonusCalculations);
        if (this.employees.length > 0) {
          this.selectedEmployeeId = this.employees[0].employeeId;
        }
        await this.onEmployeeChange();
      });
  }

  async onEmployeeChange() {
    console.log('onEmployeeChange: selectedEmployeeId', this.selectedEmployeeId);
    // 従業員詳細
    this.employeeInfo = this.employees.find(e => e.employeeId === this.selectedEmployeeId);
    if (this.employeeInfo) {
      const office = this.offices.find(o => o.id === this.employeeInfo.officeId);
      this.employeeInfo.officeName = office?.name || '';
      const prefCode = office?.insurancePrefecture || '';
      this.employeeInfo.prefectureCode = prefCode;
      this.employeeInfo.prefectureName = PREFECTURES.find(p => p.code === prefCode)?.name || '';
      console.log('選択従業員:', this.employeeInfo);
    }
    // 現在の保険等級（最新の標準報酬月額決定データ）
    const decisions = await this.firestoreService.getStandardMonthlyDecisionsByCompanyKey(this.companyKey);
    const empDecisions = decisions.filter(d => d.employeeId === this.selectedEmployeeId && d.isActive !== false);
    // 最新の適用年月のものを取得
    this.currentInsuranceInfo = empDecisions.sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth))[0] || null;
    if (this.currentInsuranceInfo) {
      const office = this.offices.find(o => o.id === this.currentInsuranceInfo.officeId);
      this.currentInsuranceInfo.prefectureCode = office?.insurancePrefecture || '';
      this.currentInsuranceInfo.prefectureName = PREFECTURES.find(p => p.code === office?.insurancePrefecture)?.name || '';
      // 保険料率を該当年月・都道府県で突合
      const ym = this.currentInsuranceInfo.applyYearMonth;
      const rates = this.insuranceRates.filter(r => r.prefectureCode === office?.insurancePrefecture && r.validFrom <= ym);
      const rate = rates.sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
      console.log('currentInsuranceInfo適用年月:', ym, '都道府県コード:', office?.insurancePrefecture, '該当rate:', rate);
      if (rate) {
        this.currentInsuranceInfo.healthRate = rate.healthInsuranceRate;
        this.currentInsuranceInfo.careRate = rate.careInsuranceRate;
        this.currentInsuranceInfo.pensionRate = rate.employeePensionInsuranceRate;
      }
      console.log('currentInsuranceInfo:', this.currentInsuranceInfo);
    }
    // 保険料適用履歴（全履歴を降順で）
    this.insuranceHistoryList = empDecisions.sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth)).map(h => {
      const office = this.offices.find(o => o.id === h.officeId);
      const prefCode = office?.insurancePrefecture || '';
      const prefName = PREFECTURES.find(p => p.code === prefCode)?.name || '';
      const ym = h.applyYearMonth;
      const rates = this.insuranceRates.filter(r => r.prefectureCode === prefCode && r.validFrom <= ym);
      const rate = rates.sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
      console.log('履歴:年月', ym, '都道府県コード:', prefCode, '該当rate:', rate);
      return {
        ...h,
        prefectureCode: prefCode,
        prefectureName: prefName,
        healthRate: rate?.healthInsuranceRate ?? '',
        careRate: rate?.careInsuranceRate ?? '',
        pensionRate: rate?.employeePensionInsuranceRate ?? ''
      };
    });
    console.log('insuranceHistoryList:', this.insuranceHistoryList);
  }

  get selectedEmployeeSalaryCalculations() {
    const filtered = this.salaryCalculations.filter(s => s.employeeId === this.selectedEmployeeId);
    console.log('selectedEmployeeSalaryCalculations:', filtered);
    return filtered;
  }
  get selectedEmployeeBonusCalculations() {
    const filtered = this.bonusCalculations.filter(b => b.employeeId === this.selectedEmployeeId);
    console.log('selectedEmployeeBonusCalculations:', filtered);
    return filtered;
  }

  getOfficeName(officeId: string): string {
    return this.offices.find(o => o.id === officeId)?.name || officeId;
  }
}
