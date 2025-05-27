import { Timestamp } from '@angular/fire/firestore';

export type WorkArrangementHistory = {
  id?: string; // FirestoreのドキュメントID（自動生成 or 明示的に付与）
  employeeId: string; // 紐付け従業員ID
  type: string; // 区分
  startDate: Date;
  endDate?: Date;
  reason?: string; // 例：第1子出産、介護など
  remarks?: string; // 備考
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 勤務形態区分
export type WorkArrangementHistoryType = {
  code: string;
  name: string;
}

// 勤務形態区分
export const WORK_ARRANGEMENT_HISTORY_TYPES: WorkArrangementHistoryType[] = [
    { code: 'maternity', name: '産前産後休業' },
    { code: 'childcare', name: '育児休業' },
    { code: 'nursingCare', name: '介護休業' },
    { code: 'shortTime', name: '時短勤務' },
    { code: 'other', name: 'その他' },
]

