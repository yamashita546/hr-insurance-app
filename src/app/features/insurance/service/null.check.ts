export interface MissingCheckResult {
  missing: boolean;
  reason: string;
}

export function checkEmployeeInputMissing(emp: any, std: any): MissingCheckResult {
  if (!emp.birthday) {
    return { missing: true, reason: '生年月日未入力' };
  }
  if (!emp.contractStartDate) {
    return { missing: true, reason: '契約開始日未入力' };
  }
  if (!emp.employeeType) {
    return { missing: true, reason: '雇用形態未入力' };
  }
  // 健康保険・厚生年金の資格取得日未入力チェック
  if (emp.healthInsuranceStatus?.isApplicable && !emp.healthInsuranceStatus.acquisitionDate) {
    return { missing: true, reason: '健康保険資格取得日未入力' };
  }
  if (
    emp.pensionStatus?.isApplicable &&
    !emp.pensionStatus.acquisitionDate &&
    emp.foreignWorker?.hasSpecialExemption !== true
  ) {
    return { missing: true, reason: '厚生年金資格取得日未入力' };
  }
  if (!std) {
    return { missing: true, reason: '標準報酬月額未登録' };
  }
  return { missing: false, reason: '' };
}
