import { Timestamp } from '@angular/fire/firestore';

export interface AttendanceAlertAction {
  alertId: string;
  employeeId: string;
  year: string;
  month: string;
  action: '対応済み' | '保留' | '無視';
  comment: string;
  operator: string;
  timestamp: Timestamp;
  companyId?: string;

  // 追加フィールド
  alertTitle: string;         // アラートタイトル
  alertDescription: string;   // アラート説明
  alertData?: AttendanceAlertData; // アラート発生時の詳細データ
}

// アラート発生時の詳細データ型
export interface AttendanceAlertData {
  scheduledWorkHours: number;
  scheduledWorkDays: number;
  employeeType: string;
  officeName: string;
  [key: string]: any; // 必要に応じて拡張
}
