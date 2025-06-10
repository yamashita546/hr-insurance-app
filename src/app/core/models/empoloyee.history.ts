// 従業員異動履歴モデル
export interface EmployeeTransferHistory {
  employeeId: string;
  fromOfficeId: string;
  fromOfficeName: string;
  toOfficeId: string;
  toOfficeName: string;
  transferDate: string; // YYYY-MM-DD
  registeredAt: string; // 登録日時
  cancelled?: boolean; // キャンセルされた場合true
  remarks?: string;
}
