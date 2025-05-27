// 従業員区分
export interface EmployeeType {
    code: string; // 例: "regular"
    name: string; // 例: "正社員"
  }

  // 従業員区分
  export const EMPLOYEE_TYPES: EmployeeType[] = [
    { code: 'regular', name: '正社員' },
    { code: 'contract', name: '契約社員' },
    { code: 'parttime', name: 'パート' },
  ]

  // 勤務形態区分
  export interface WorkStyleType {
    code: string; // 例: "fulltime"
    name: string; // 例: "フルタイム"
  }

  // 勤務形態区分
  export const WORK_STYLE_TYPES: WorkStyleType[] = [
    { code: 'fulltime', name: 'フルタイム' },
    { code: 'shorttime', name: '時短' },
    { code: 'parttime', name: 'パート' },
    { code: 'temporary', name: '臨時' },
    { code: 'homeoffice', name: 'ホームオフィス' },
    { code: 'remote', name: 'リモート' },
    { code: 'other', name: 'その他' },
  ]
