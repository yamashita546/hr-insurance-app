
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