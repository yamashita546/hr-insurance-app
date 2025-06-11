// 標準報酬月額算定用チェックリスト項目
export interface StandardMonthlyChecklistItem {
  code: number;
  name: string;
}

export const STANDARD_MONTHLY_CHECKLIST: StandardMonthlyChecklistItem[] = [
  { code: 1, name: '70歳以上被用者算定' },
  { code: 2, name: '二以上勤務' },
  { code: 3, name: '月額変更予定' },
  { code: 4, name: '途中入社' },
  { code: 5, name: '病休・育休・休職等' },
  { code: 6, name: '短時間労働者（特定適用事業所等）' },
  { code: 7, name: 'パート' },
  { code: 8, name: '年間平均' },
  { code: 9, name: 'その他' }
];
