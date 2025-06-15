// 産前産後休業免除判定
export function isMaternityLeaveExempted(emp: any, ymStr: string): boolean {
  if (!emp || !Array.isArray(emp.maternityLeaves)) return false;
  return emp.maternityLeaves.some((leave: any) => {
    if (!leave.startDate || !leave.endDate) return false;
    const from = new Date(leave.startDate);
    const to = new Date(leave.endDate);
    const [y, m] = ymStr.split('-').map(Number);
    const target = new Date(y, m - 1, 1);
    return target >= from && target <= to;
  });
}
// 育児休業免除判定
export function isChildcareLeaveExempted(emp: any, ymStr: string): boolean {
  if (!emp || !Array.isArray(emp.childcareLeaves)) return false;
  return emp.childcareLeaves.some((leave: any) => {
    if (!leave.startDate || !leave.endDate) return false;
    const from = new Date(leave.startDate);
    const to = new Date(leave.endDate);
    const [y, m] = ymStr.split('-').map(Number);
    const target = new Date(y, m - 1, 1);
    return target >= from && target <= to;
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
