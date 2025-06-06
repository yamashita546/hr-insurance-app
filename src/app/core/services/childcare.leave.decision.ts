// 産前産後休業の社会保険免除判定
export function isMaternityLeaveExempted(employee: any, targetYm: string): boolean {
  if (!employee.extraordinaryLeaves || !Array.isArray(employee.extraordinaryLeaves)) return false;
  const [year, month] = targetYm.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  return employee.extraordinaryLeaves.some((leave: any) => {
    if (leave.leaveTypeCode !== 'maternity') return false;
    if (!leave.leaveStartDate) return false;
    const start = new Date(leave.leaveStartDate);
    const end = leave.leaveEndDate ? new Date(leave.leaveEndDate) : null;
    // 1日でも重なれば免除
    if (end) {
      return start <= monthEnd && end >= monthStart;
    } else {
      return start <= monthEnd;
    }
  });
}

// 育児休業の社会保険免除判定
export function isChildcareLeaveExempted(employee: any, targetYm: string): boolean {
  if (!employee.extraordinaryLeaves || !Array.isArray(employee.extraordinaryLeaves)) return false;
  const [year, month] = targetYm.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  return employee.extraordinaryLeaves.some((leave: any) => {
    if (leave.leaveTypeCode !== 'childcare') return false;
    if (!leave.leaveStartDate) return false;
    const start = new Date(leave.leaveStartDate);
    const end = leave.leaveEndDate ? new Date(leave.leaveEndDate) : null;
    // ①月末が休業期間内なら免除
    if (!end || end >= monthEnd) {
      if (start <= monthEnd) return true;
    }
    // ②月内で休業が終了し、14日以上休業していれば免除
    if (end && end < monthEnd && start <= end && start <= monthEnd && end >= monthStart) {
      // 休業期間の重なり部分を計算
      const overlapStart = start < monthStart ? monthStart : start;
      const overlapEnd = end > monthEnd ? monthEnd : end;
      const diffDays = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays >= 14) return true;
    }
    return false;
  });
}
