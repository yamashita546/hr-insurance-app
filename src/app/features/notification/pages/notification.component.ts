import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../../core/services/firestore.service';
import { AlertService, SocialInsuranceAlert } from '../../../core/services/alert.service';
import { Company } from '../../../core/models/company.model';
import { Subscription } from 'rxjs';
import { UserCompanyService } from '../../../core/services/user-company.service';
import { StandardMonthlyDecision } from '../../../core/models/standard-monthly-decision .model';
import { HealthInsuranceGrade, PensionInsuranceGrade } from '../../../core/models/standard-manthly.model';
import { StandardMonthlyRevisionAlert } from '../../../core/services/alert.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css'
})
export class NotificationComponent implements OnInit, OnDestroy {
  company: Company | null = null;
  alerts: SocialInsuranceAlert[] = [];
  loading = true;
  private companySub?: Subscription;
  standardMonthlyRevisionAlerts: StandardMonthlyRevisionAlert[] = [];

  constructor(
    private firestoreService: FirestoreService,
    private alertService: AlertService,
    private userCompanyService: UserCompanyService
  ) {}

  async ngOnInit() {
    // company$を購読し、値がnullでなければ初期化処理を実行
    this.companySub = this.userCompanyService.company$.subscribe(async company => {
      if (!company) return;
      this.company = company;
      const companyKey = company.companyKey;
      // データ取得
      const [attendances, employees, salaries, standardMonthlyDecisions, gradeMaster] = await Promise.all([
        this.firestoreService.getAttendancesByCompanyKey(companyKey),
        this.firestoreService.getEmployeesByCompanyKey(companyKey),
        this.firestoreService.getSalariesByCompanyKey(companyKey),
        this.firestoreService.getStandardMonthlyDecisionsByCompanyKey(companyKey),
        firstValueFrom(this.firestoreService.getStandardMonthlyGrades())
      ]);
      // デバッグ用ログ出力
      console.log('【DEBUG】取得した勤怠データ:', attendances);
      console.log('【DEBUG】取得した従業員データ:', employees);
      console.log('【DEBUG】取得した給与データ:', salaries);
      console.log('【DEBUG】取得したcompanyKey:', companyKey);
      // アラート生成
      this.alerts = await this.alertService.getSocialInsuranceRecommendationAlerts(
        attendances,
        employees,
        salaries,
        companyKey
      );
      // 随時改定アラート
      const now = new Date();
      this.standardMonthlyRevisionAlerts = await this.alertService.getStandardMonthlyRevisionAlerts(
        employees, salaries, standardMonthlyDecisions, gradeMaster as (HealthInsuranceGrade | PensionInsuranceGrade)[], now.getFullYear(), now.getMonth() + 1
      );
      // アラート判定結果のデバッグ出力
      console.log('【DEBUG】アラート判定結果:', this.alerts);
      this.loading = false;
    });
  }

  ngOnDestroy() {
    this.companySub?.unsubscribe();
  }

  onHandleAlert(alert: SocialInsuranceAlert) {
    // 今後、対応記録ダイアログや処理を実装予定
    window.alert('対応記録ダイアログ（仮）: ' + alert.employeeName);
  }
}
