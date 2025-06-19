import { isMaternityLeaveExempted, isChildcareLeaveExempted } from './check.service';

// export function isCareInsuranceApplicableForDisplay(
//   emp: any,
//   std: any,
//   rate: any,
//   year: number,
//   month: number,
//   healthApplicable: boolean,
//   ymStr: string
// ): boolean {
//   // 1. 健康保険が適用されていない場合は不可
//   if (!healthApplicable) return false;
//   // 2. 介護保険料率が0または未設定
//   if (!rate || !rate.careInsuranceRate || rate.careInsuranceRate <= 0) return false;
//   // 3. 標準報酬月額が未設定
//   if (!std) return false;
//   // 4. 40歳以上65歳未満かつ、40歳到達月の前日以降・65歳到達月の前日まで
//   const birth = new Date(emp.birthday);
//   const target = new Date(year, month - 1, 1);
//   let age = target.getFullYear() - birth.getFullYear();
//   if (target.getMonth() < birth.getMonth() || (target.getMonth() === birth.getMonth() && target.getDate() < birth.getDate())) {
//     age--;
//   }
//   if (age < 40 || age >= 65) return false;
//   // 5. 免除特例（産休・育休）
//   if (isMaternityLeaveExempted(emp, ymStr) || isChildcareLeaveExempted(emp, ymStr)) return false;
//   // 6. 外国人特例（必要に応じて追加）
//   if (emp.foreignWorker?.hasSpecialExemption) return false;
//   return true;
// }


export function isCareInsuranceApplicableForDisplay(
    emp: any,
    std: any,
    rate: any,
    year: number,
    month: number,
    healthApplicable: boolean,
    ymStr: string
  ): boolean {
    if (!healthApplicable) {
      console.log(`[careInsurance] ×: healthApplicable=false`, emp, std, rate, year, month);
      return false;
    }
    if (!rate || !rate.careInsuranceRate || rate.careInsuranceRate <= 0) {
      console.log(`[careInsurance] ×: careInsuranceRate missing or 0`, emp, std, rate, year, month);
      return false;
    }
    if (!std) {
      console.log(`[careInsurance] ×: std missing`, emp, std, rate, year, month);
      return false;
    }

    // 誕生日の前日が算定月内に含まれるか（1日生まれ特例も考慮）
    const birth = new Date(emp.birthday);
    const careStartDate = new Date(birth.getFullYear() + 40, birth.getMonth(), birth.getDate() - 1);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    let careApplicable = false;
    if (careStartDate >= monthStart && careStartDate <= monthEnd) {
      careApplicable = true;
    } else if (birth.getDate() === 1 && careStartDate <= monthEnd) {
      // 1日生まれ特例：前月から適用
      careApplicable = true;
    }
    // 65歳到達月の前日まで
    const careEndDate = new Date(birth.getFullYear() + 65, birth.getMonth(), birth.getDate() - 1);
    if (careEndDate < monthStart) careApplicable = false;
    if (!careApplicable) {
      console.log('[careInsurance] ×: careStartDate/careEndDate条件', emp, std, rate, year, month, careStartDate, careEndDate, monthStart, monthEnd);
      return false;
    }

    if (isMaternityLeaveExempted(emp, ymStr) || isChildcareLeaveExempted(emp, ymStr)) {
      console.log(`[careInsurance] ×: maternity/childcare exemption`, emp, std, rate, year, month);
      return false;
    }
    if (emp.foreignWorker?.hasSpecialExemption) {
      console.log(`[careInsurance] ×: foreign worker special exemption`, emp, std, rate, year, month);
      return false;
    }
    console.log(`[careInsurance] 〇: all conditions met`, emp, std, rate, year, month);
    return true;
  }
  