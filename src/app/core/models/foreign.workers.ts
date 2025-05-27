// 外国人労働者の要配慮事項リスト
export type ForeignWorker = {
  romanName: string;              // 氏名（ローマ字）
  nationality: string;            // 国籍
  residenceStatus: string;        // 在留資格
  residenceStatusType?: string;   // 在留資格の種類
  residenceCardNumber?: string;   // 在留カード番号
  residenceCardExpiry?: Date;     // 在留資格の有効期限
  residenceStatusHistory?: string;// 在留資格の更新履歴
  passportNumber?: string;        // パスポート番号
  passportExpiry?: Date;          // パスポート有効期限
  hasResidenceCardCopy?: boolean; // 在留カード写しの有無
  hasSpecialExemption?: boolean;  // 社会保険の免除特例の有無
  exemptionReason?: string;       // 免除特例の理由
  employmentStartDate?: Date;     // 雇用開始日
  employmentEndDate?: Date;       // 雇用契約期間
  hasSpecificActivity?: boolean;  // 特定活動の有無
  returnPlannedDate?: Date;       // 帰国予定日
  remarks?: string;               // 備考
};


