import { Timestamp } from '@angular/fire/firestore';

// 勤怠情報モデル
export interface Attendance {
  companyKey: string;
  employeeId: number;
  employeeName: string;
  scheduledWorkDays: number; // 所定労働日数（その月に勤務予定だった日数）
  actualWorkDays: number; // 実際の勤務日数
  scheduledWorkHours: number; // 所定労働時間数（その月の合計）
  actualWorkHours: number; // 実際の労働時間（その月の合計）
  absentDays: number; // 欠勤日数（無断欠勤含む）
  leaveWithoutPayDays: number; // 無給休暇の日数（時短勤務除く）
  paidLeaveDays: number; // 有給取得日数
  
  // 休暇情報
  childCareLeaveStartDate?: Date | null; // 育児休業開始日
  childCareLeaveEndDate?: Date | null; // 育児休業終了日
  holidaySpecialDays?: number; // 休暇特例日数

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// 英語カラム名→日本語ラベルのマッピング辞書
export const ATTENDANCE_COLUMN_LABELS: { [key: string]: string } = {
  year: '年度',
  month: '月',
  officeName: '事業所',
  employeeId: 'ID',
  employeeName: '氏名',
  scheduledWorkDays: '所定労働日数',
  actualWorkDays: '勤務日数',
  scheduledWorkHours: '所定労働時間',
  actualWorkHours: '実際の労働時間',
  absentDays: '欠勤日数',
  leaveWithoutPayDays: '無給休暇日数',
  paidLeaveDays: '有給取得日数',
  holidaySpecialDays: '休暇特例日数',
  childCareLeaveStartDate: '育児休業開始日',
  childCareLeaveEndDate: '育児休業終了日',
  companyKey: '会社ID'
};

// 画面表示順のカラム配列
export const ATTENDANCE_COLUMN_ORDER = [
  'year', 'month', 'officeName', 'employeeId', 'employeeName',
  'scheduledWorkDays', 'actualWorkDays', 'scheduledWorkHours', 'actualWorkHours',
  'absentDays', 'leaveWithoutPayDays', 'paidLeaveDays',
  'childCareLeaveStartDate', 'childCareLeaveEndDate',
  'holidaySpecialDays',
  'companyKey'
];
