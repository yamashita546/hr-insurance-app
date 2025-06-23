// Firestore保存用：給与計算結果
export interface InsuranceSalaryCalculation {
  companyKey: string;
  officeId: string;
  employeeId: string;
  applyYearMonth: string;
  healthGrade: number | string;
  healthMonthly: number;
  pensionGrade: number | string;
  pensionMonthly: number;
  salaryTotal: number;
  salaryAvg: number;
  careInsurance: boolean;
  careInsuranceMonthly: number;
  careInsuranceDeduction: number;
  healthInsurance: number;
  healthInsuranceDeduction: number;
  pension: number;
  pensionDeduction: number;
  deductionTotal: number;
  childcare: number;
  companyShare: number;
  createdAt: Date;
  updatedAt: Date;
}

// Firestore保存用：賞与計算結果
export interface InsuranceBonusCalculation {
  companyKey: string;
  officeId: string;
  employeeId: string;
  applyYearMonth: string;
  healthGrade: number | string;
  healthMonthly: number;
  pensionGrade: number | string;
  pensionMonthly: number;
  bonusTotal: number;
  bonusAvg: number;
  careInsurance: boolean;
  careInsuranceMonthly: number;
  careInsuranceDeduction: number;
  healthInsurance: number;
  healthInsuranceDeduction: number;
  pension: number;
  pensionDeduction: number;
  deductionTotal: number;
  childcare: number;
  companyShare: number;
  standardBonus: number;
  annualBonusTotal: number;
  annualBonusTotalBefore: number;
  bonusDiff: number;
  createdAt: Date;
  updatedAt: Date;
}
