import { Injectable } from '@angular/core';
import { Attendance } from '../models/attendance.model';
import { Employee } from '../models/employee.model';

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
  getSocialInsuranceRecommendationAlerts(
    attendances: Attendance[],
    employees: Employee[],
    salaries: Salary[],
    companyKey: string
  ): SocialInsuranceAlert[] {
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
}
