// 勤怠情報モデル
export interface Attendance {
  companyId: number;
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
  familyCareLeaveStartDate?: Date | null; // 介護休業開始日
  familyCareLeaveEndDate?: Date | null; // 介護休業終了日
  injuryOrSicknessLeaveStartDate?: Date | null; // 傷病による休業開始日
  injuryOrSicknessLeaveEndDate?: Date | null; // 傷病による休業終了日
  isOnFullLeaveThisMonth?: boolean; // 月全体で無給休業中か（報酬ゼロの判定用）

}
