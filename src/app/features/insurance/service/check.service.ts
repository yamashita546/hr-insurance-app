// 産前産後休業免除判定
export function isMaternityLeaveExempted(emp: any, ymStr: string): boolean {
  if (!emp || !Array.isArray(emp.extraordinaryLeaves)) return false;
  return emp.extraordinaryLeaves.some((leave: any) => {
    if (leave.leaveTypeCode !== 'maternity') return false;
    if (!leave.leaveStartDate || !leave.leaveEndDate) return false;
    const from = new Date(leave.leaveStartDate);
    const to = new Date(leave.leaveEndDate);
    // 判定日: 終了日の翌日
    const judge = new Date(to);
    judge.setDate(judge.getDate() + 1);

    const [y, m] = ymStr.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);

    // 休業期間と算定月が重なっているか
    const inLeave = monthStart <= to && from <= monthEnd;
    // 判定日が算定月内なら免除しない
    const judgeInMonth = judge >= monthStart && judge <= monthEnd;

    // 休業期間と算定月が重なっていて、かつ判定日が算定月内でなければ免除
    return inLeave && !judgeInMonth;
  });
}
// 育児休業免除判定
export function isChildcareLeaveExempted(emp: any, ymStr: string): boolean {
  if (!emp || !Array.isArray(emp.childcareLeaves)) return false;
  return emp.childcareLeaves.some((leave: any) => {
    if (!leave.startDate || !leave.endDate) return false;
    const from = new Date(leave.startDate);
    const to = new Date(leave.endDate);
    // 判定日: 終了日の翌日
    const judge = new Date(to);
    judge.setDate(judge.getDate() + 1);

    const [y, m] = ymStr.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);

    // 休業期間と算定月が重なっているか
    const inLeave = monthStart <= to && from <= monthEnd;
    if (!inLeave) return false;

    // 1. 開始日と終了日が同じ月の場合
    if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
      // 算定月がその月か
      if (from.getFullYear() === y && (from.getMonth() + 1) === m) {
        // 休業日数
        const days = (to.getDate() - from.getDate()) + 1;
        return days >= 14;
      } else {
        return false;
      }
    }

    // 2. 異なる月にまたがる場合
    // 算定月が開始月
    if (from.getFullYear() === y && (from.getMonth() + 1) === m) {
      return true;
    }
    // 算定月が終了月
    if (to.getFullYear() === y && (to.getMonth() + 1) === m) {
      return false;
    }
    // 算定月が開始月でも終了月でもない（中間の月）
    return true;
  });
}

// 賞与用：育児休業免除判定
export function isChildcareLeaveExemptedForBonus(emp: any, ymStr: string): boolean {
  if (!emp || !Array.isArray(emp.childcareLeaves)) return false;
  return emp.childcareLeaves.some((leave: any) => {
    if (!leave.startDate || !leave.endDate) return false;
    const from = new Date(leave.startDate);
    const to = new Date(leave.endDate);
    const [y, m] = ymStr.split('-').map(Number);
    const monthEnd = new Date(y, m, 0); // 賞与対象月の末日

    // ①賞与の対象月の末日が休業期間に含まれていること
    if (!(monthEnd >= from && monthEnd <= to)) return false;

    // ②休業期間が1か月を超えていること
    // 1か月後の日付を求める
    const nextMonth = new Date(from);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    let oneMonthLater;
    if (from.getDate() === nextMonth.getDate()) {
      // 例外なく同じ日付が存在する
      oneMonthLater = new Date(nextMonth);
      oneMonthLater.setDate(oneMonthLater.getDate() - 1);
    } else {
      // 翌月に同じ日付がない場合は月末
      oneMonthLater = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
    }
    // 休業終了日が1か月後の日付を超えているか
    return to > oneMonthLater;
  });
}

/**
 * 社会保険上の退職日を取得（契約終了日の翌日）
 */
export function getRetirementDate(emp: any): Date | null {
  if (!emp || !emp.contractEndDate) return null;
  const end = new Date(emp.contractEndDate);
  end.setDate(end.getDate() + 1);
  return end;
}

/**
 * 社会保険料免除判定
 * @returns { exemption: boolean, exemptionType: string | null }
 */
export function checkInsuranceExemption(emp: any, ymStr: string): { exemption: boolean, exemptionType: string | null } {
  const retirementDate = getRetirementDate(emp);
  if (!retirementDate) return { exemption: false, exemptionType: null };

  const [y, m] = ymStr.split('-').map(Number);
  const targetYm = new Date(y, m - 1, 1);
  const targetYmEnd = new Date(y, m, 0); // 月末

  // 退職日が対象月内か？
  if (retirementDate >= targetYm && retirementDate <= targetYmEnd) {
    // 契約開始日が同月か？
    if (emp.contractStartDate) {
      const start = new Date(emp.contractStartDate);
      if (start.getFullYear() === y && (start.getMonth() + 1) === m) {
        return { exemption: false, exemptionType: '同月得喪' };
      }
    }
    return { exemption: true, exemptionType: '月内退職' };
  }
  return { exemption: false, exemptionType: null };
}
