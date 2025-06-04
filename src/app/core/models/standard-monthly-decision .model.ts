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