import { Injectable } from '@angular/core';
import { Attendance } from '../models/attendance.model';
import { Employee } from '../models/employee.model';
import { HealthInsuranceGrade, PensionInsuranceGrade } from '../models/standard-manthly.model';
import { firstValueFrom } from 'rxjs';

export interface SocialInsuranceAlert {
  employeeName: string;
  officeName: string;
  employeeType: string;
  scheduledWorkHours: number;
  scheduledWorkDays: number;
  employeeId: string;
  year: string;
  month: string;
  companyId?: string;
  basicSalary?: number;
}

export interface Salary {
  employeeId: string;
  year: string;
  month: string;
  basicSalary: number;
  targetYearMonth: string;
  [key: string]: any;
}

export interface StandardMonthlyDecision {
  employeeId: string;
  officeId: string;
  applyYearMonth: string;
  healthGrade: string;
  healthMonthly: number;
  // ...他必要に応じて
}

export interface StandardMonthlyRevisionAlert {
  employeeName: string;
  officeName: string;
  employeeId: string;
  currentGrade: string;
  currentMonthly: number;
  avgSalary: number;
  newGrade: string | number;
  newMonthly: number;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  /**
   * 社会保険加入推奨アラートの判定
   * @param attendances 勤怠データ配列
   * @param employees 従業員データ配列
   * @param salaries 給与データ配列
   * @param companyKey 所属企業キー
   * @returns アラート対象リスト
   */
  async getSocialInsuranceRecommendationAlerts(
    attendances: Attendance[],
    employees: Employee[],
    salaries: Salary[],
    companyKey: string
  ): Promise<SocialInsuranceAlert[]> {
    const thresholdHours = 87; // 週20時間 = 月約87時間
    const thresholdSalary = 88000; // 月額8.8万円
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1); // 直近6か月分

    // 企業で絞り込み & 6か月分のみ
    const filteredAttendances = attendances.filter(a => {
      const attDate = new Date(Number((a as any).year), Number((a as any).month) - 1, 1);
      return (
        (a as any).companyKey === companyKey &&
        attDate >= sixMonthsAgo &&
        attDate <= now
      );
    });

    // 社員・年月ごとに最新のupdatedAtを持つ勤怠を残す
    const latestMap = new Map<string, Attendance>();
    filteredAttendances.forEach(a => {
      const key = `${(a as any).employeeId}_${(a as any).year}_${(a as any).month}`;
      const updatedAt = (a as any).updatedAt ? new Date((a as any).updatedAt.toDate ? (a as any).updatedAt.toDate() : (a as any).updatedAt) : new Date(0);
      if (!latestMap.has(key)) {
        latestMap.set(key, a);
      } else {
        const prev = latestMap.get(key)!;
        const prevUpdatedAt = (prev as any).updatedAt ? new Date((prev as any).updatedAt.toDate ? (prev as any).updatedAt.toDate() : (prev as any).updatedAt) : new Date(0);
        if (updatedAt > prevUpdatedAt) {
          latestMap.set(key, a);
        }
      }
    });
    const latestList = Array.from(latestMap.values());
    return latestList.filter(att => {
      const emp = employees.find(e => e.employeeId === String((att as any).employeeId ?? ''));
      if (!emp) return false;
      if (emp.isStudent) return false;
      const type = (emp.employeeType || '').toLowerCase();
      const isPartOrBaito = type.includes('パート') || type.includes('ｱﾙﾊﾞｲﾄ') || type.includes('アルバイト');
      // 給与データ取得
      const targetYearMonth = `${(att as any).year}-${String((att as any).month).padStart(2, '0')}`;
      const salary = salaries.find(s => String(s.employeeId) === String((att as any).employeeId) && s.targetYearMonth === targetYearMonth);
      const basicSalary = Number(salary?.basicSalary) || 0;
      const isNotJoined = !emp.healthInsuranceStatus?.isApplicable && !emp.pensionStatus?.isApplicable;
      const enoughHours = Number((att as any).scheduledWorkHours) >= thresholdHours;
      const enoughSalary = basicSalary >= thresholdSalary;
      // 両方の基準を満たす場合のみアラート
      return isPartOrBaito && isNotJoined && (enoughHours && enoughSalary);
    }).map(att => {
      const emp = employees.find(e => e.employeeId === String((att as any).employeeId ?? ''));
      const targetYearMonth = `${(att as any).year}-${String((att as any).month).padStart(2, '0')}`;
      const salary = salaries.find(s => String(s.employeeId) === String((att as any).employeeId) && s.targetYearMonth === targetYearMonth);
      return {
        employeeName: (att as any).employeeName,
        officeName: (att as any).officeName,
        employeeType: emp?.employeeType || '',
        scheduledWorkHours: (att as any).scheduledWorkHours,
        scheduledWorkDays: (att as any).scheduledWorkDays,
        employeeId: (att as any).employeeId,
        year: (att as any).year,
        month: (att as any).month,
        companyId: (att as any).companyId,
        basicSalary: Number(salary?.basicSalary) || 0
      };
    });
  }

  /**
   * 標準報酬月額 随時改定アラート
   * @param employees 従業員データ
   * @param salaries 給与データ
   * @param standardMonthlyDecisions 標準報酬月額決定データ
   * @param gradeMaster 等級マスタ
   * @param selectedYear チェック基準年月（例：今月）
   * @param selectedMonth
   */
  async getStandardMonthlyRevisionAlerts(
    employees: Employee[],
    salaries: Salary[],
    standardMonthlyDecisions: StandardMonthlyDecision[],
    gradeMaster: (HealthInsuranceGrade | PensionInsuranceGrade)[],
    selectedYear: number,
    selectedMonth: number
  ): Promise<StandardMonthlyRevisionAlert[]> {
    // 直近3ヶ月の年月リスト
    const months: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const date = new Date(selectedYear, selectedMonth - 1 - i, 1);
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
    return employees.map(emp => {
      // 直近3ヶ月の給与平均
      const targetSalaries = salaries.filter(s => s.employeeId === emp.employeeId && months.includes(s.targetYearMonth));
      if (targetSalaries.length < 3) return null;
      const avgSalary = targetSalaries.reduce((sum, s) => sum + Number(s['totalSalary']), 0) / 3;
      // 現行標準報酬月額
      const std = standardMonthlyDecisions
        .filter(r => r.employeeId === emp.employeeId && r.applyYearMonth <= months[2])
        .sort((a, b) => b.applyYearMonth.localeCompare(a.applyYearMonth))[0];
      if (!std) return null;
      // 新等級候補
      const newGradeObj = gradeMaster.find(g => g.lowerLimit <= avgSalary && avgSalary < g.upperLimit);
      if (!newGradeObj) return null;
      // 等級差
      if (Math.abs(Number(std.healthGrade) - Number(newGradeObj.grade)) >= 2) {
        return {
          employeeName: emp.lastName + ' ' + emp.firstName,
          officeName: emp.officeName,
          employeeId: emp.employeeId,
          currentGrade: std.healthGrade,
          currentMonthly: std.healthMonthly,
          avgSalary,
          newGrade: String(newGradeObj.grade),
          newMonthly: newGradeObj.compensation
        };
      }
      return null;
    }).filter(Boolean) as StandardMonthlyRevisionAlert[];
  }
}
