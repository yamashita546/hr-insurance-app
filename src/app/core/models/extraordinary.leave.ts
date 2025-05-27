// 社会保険管理上考慮が必要な休職区分リスト
export type ExtraordinaryLeaveType = {
  code: string;
  label: string;
};

export const EXTRAORDINARY_LEAVE_TYPES: ExtraordinaryLeaveType[] = [
  { code: 'maternity', label: '産前産後休業' },
  { code: 'childcare', label: '育児休業' },
  { code: 'care', label: '介護休業' },
  { code: 'injury', label: '傷病休職' },
  { code: 'private_injury', label: '私傷病休職' },
  { code: 'general', label: '休職（一般）' },
  { code: 'company_leave', label: '休業（会社都合・天災等）' },
];

// 休職中に管理すべき項目
export type ExtraordinaryLeaveDetail = {
  leaveTypeCode: string;           // 休職区分コード
  leaveStartDate: Date;            // 休職開始日
  leaveEndDate?: Date;             // 休職終了日
  returnPlanDate?: Date;           // 復職予定日
  leaveReason?: string;            // 休職理由
  isInsuranceExempted?: boolean;   // 社会保険料免除対象
  isEmploymentBenefit?: boolean;   // 雇用保険給付対象
  isSalaryPaid?: boolean;          // 給与支給有無
  hasWorkRestriction?: boolean;    // 就労制限有無
  hasMedicalCertificate?: boolean; // 医師の診断書有無
  hasSpecialExemption?: boolean;   // 特例適用有無
  remarks?: string;                // 備考
};

