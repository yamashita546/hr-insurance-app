// 基本給与モデル
export interface Salary {
    employeeId: string;
    targetYearMonth: string;

    // 基本給関連
    basicSalary: number; // 基本給
    overtimeSalary: number; // 残業手当
    commuteAllowance?: number; // 通勤手当
    commuteAllowanceMonths?: number; // 何か月分か
    commuteAllowancePeriodFrom?: string; // 対象期間開始（YYYY-MM）
    commuteAllowancePeriodTo?: string;   // 対象期間終了（YYYY-MM）
    splitCurrency?: number; // 通勤費按分
    otherAllowanceName?: string; // その他手当名
    otherAllowance?: number; // その他手当
    totalCurrency?: number; // 通貨合計
  
    // 現物支給関連
    inKindAllowance?: number; // 現物支給
    inKindAllowanceName?: string; // 現物支給名称
    totalInKind?: number; // 現物合計

    // 遡及手当関連
    retroAllowance?: number; // 遡及手当
    retroAllowanceName?: string; // 遡及手当名称
    totalRetro?: number; // 遡及合計

    // 実費精算関連
    actualExpense?: number; // 実費精算
    actualExpenseName?: string; // 実費精算名称
    totalActualExpense?: number; // 実費精算合計

    // 総手当関連
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

