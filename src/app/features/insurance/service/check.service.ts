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
