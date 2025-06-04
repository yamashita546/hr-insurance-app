// 基本給与モデル
export interface Salary {
    employeeId: string;
    targetYearMonth: string;
    basicSalary: number; // 基本給
    overtimeSalary: number; // 残業手当
    otherAllowanceName?: string; // その他手当名
    otherAllowance?: number; // その他手当
    // 通勤手当関連
    commuteAllowance?: number;
    commuteAllowanceMonths?: number; // 何か月分か
    commuteAllowancePeriodFrom?: string; // 対象期間開始（YYYY-MM）
    commuteAllowancePeriodTo?: string;   // 対象期間終了（YYYY-MM）
    totalAllowance: number; // 総手当
    totalSalary: number; // 総支給額
    remarks?: string; // 備考
    createdAt: Date;
    updatedAt: Date;
  }


  // 手当モデル
export interface Allowance {
    employeeId: string;
    targetYearMonth: string;
    allowanceName: string; // 手当名
    allowanceType: string; // 手当種類
    allowance: number;
    remarks?: string; // 備考
    createdAt: Date;
    updatedAt: Date;
}
//賞与モデル
export interface Bonus {
    employeeId: string;
    targetYearMonth: string;
    bonusName?: string; // 賞与名
    bonusType: string; // 賞与種類
    bonus: number;
    bonusTotal: number;
    remarks?: string; // 備考
    createdAt: Date;
    updatedAt: Date;
}

// 賞与タイプ
export enum BonusType {
    AnnualBonus = '年間賞与',
    MidYearBonus = '半年賞与',
    QuarterlyBonus = '四半期賞与',
    MonthlyBonus = '月次賞与',
    OtherBonus = 'その他賞与',
}

// プロパティ名→日本語名変換用辞書
export const SalaryFieldNameMap: Record<string, string> = {
  basicSalary: '基本給',
  overtimeSalary: '時間外手当',
  commuteAllowance: '通勤手当',
  positionAllowance: '役職手当',
  otherAllowanceName: 'その他手当名',
  otherAllowance: 'その他手当',
  totalAllowance: '総手当',
  totalSalary: '総支給額',
  remarks: '備考',
  commuteAllowancePeriodFrom: '通勤手当期間開始',
  commuteAllowancePeriodTo: '通勤手当期間終了',
  commuteAllowanceMonths: '通勤手当月数',
};

export const BonusFieldNameMap: Record<string, string> = {
  bonusName: '賞与名',
  bonusType: '賞与種類',
  bonus: '金額',
  bonusTotal: '合計金額',
  remarks: '備考',
};

export const AllowanceFieldNameMap: Record<string, string> = {
  allowanceName: '手当名',
  allowanceType: '手当種類',
  allowance: '手当額',
  remarks: '備考',
};

