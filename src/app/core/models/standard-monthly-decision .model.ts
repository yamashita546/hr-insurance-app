// コード定数
export const STANDARD_MONTHLY_DECISION_TYPES = [
  'fixed',      // 定時決定
  'occasional', // 随時改定
  'entry',      // 入社時決定
  're',         // 再決定
  'other',      // その他
] as const;

export type StandardMonthlyDecisionType = typeof STANDARD_MONTHLY_DECISION_TYPES[number];

export interface StandardMonthlyDecision {
  companyKey: string;
  officeId: string;
  employeeId: string;
  applyYearMonth: string; // 例: "2025-09"
  healthGrade: number | string;
  healthMonthly: number;
  pensionGrade: number | string;
  pensionMonthly: number;
  salaryTotal: number;
  salaryAvg: number;
  createdAt: Date;
  updatedAt: Date;
  type: StandardMonthlyDecisionType;
  // 見込み報酬内訳（入社時決定用）
  estimatedBaseSalary?: number;      // 基本給
  estimatedOvertime?: number;        // 残業代
  estimatedCommute?: number;         // 通勤費
  estimatedPositionAllowance?: number; // 役職手当
  estimatedOtherAllowance?: number;  // その他手当
  estimatedInKind?: number;          // 現物支給
  estimatedTotal?: number;           // 支給総額（自動計算）
  isCareInsuranceApplicable?: boolean; // 介護保険適用
  aprilSalary?: number | null;
  maySalary?: number | null;
  juneSalary?: number | null;
  usedMonths?: string; // 算定に利用した月（例: "4,5,6" や "5,6"）
  isActive?: boolean; // 論理削除用
  checklist?: any;
  calculationRows?: any[];
}

export interface StandardBonusDecision {
  companyKey: string;
  officeId: string;
  employeeId: string;
  applyYearMonth: string; // 例: "2025-09"
  healthGrade: number | string;
  healthMonthly: number;
  pensionGrade: number | string;
  pensionMonthly: number;
  bonusTotal: number;
  bonusAvg: number;
}

// 日本語変換用辞書
export const STANDARD_MONTHLY_DECISION_TYPE_LABELS: { [key in StandardMonthlyDecisionType]: string } = {
  fixed: '定時決定',
  occasional: '随時改定',
  entry: '入社時決定',
  re: '再決定',
  other: 'その他',
};