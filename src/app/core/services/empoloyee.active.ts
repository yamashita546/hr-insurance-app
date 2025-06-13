import { Employee } from '../models/employee.model';

/**
 * 指定年月（year, month）時点で従業員が選択肢として有効か判定
 */
export function isEmployeeSelectable(emp: Employee, year?: string, month?: string): boolean {
  // 1. isActiveがfalseなら除外
  if (emp.isActive === false) return false;
  // 2. 退職者判定: contractEndDateがあり、かつisResigned===true の場合のみ2か月ルール
  if (emp.isResigned === true && emp.contractEndDate && year && month) {
    const ymNum = (y: string, m: string) => Number(y) * 100 + Number(m);
    const targetYm = ymNum(year, month);
    const endDate = emp.contractEndDate instanceof Date ? emp.contractEndDate : new Date(emp.contractEndDate);
    const endYear = String(endDate.getFullYear());
    const endMonth = String(endDate.getMonth() + 1);
    let endYm = ymNum(endYear, endMonth);
    let endYmPlus2 = endYm + 2;
    let eYear = Number(endYear), eMonth = Number(endMonth);
    if (eMonth === 11) endYmPlus2 = ymNum(String(eYear+1), '1');
    if (eMonth === 12) endYmPlus2 = ymNum(String(eYear+1), '2');
    return targetYm <= endYmPlus2;
  }
  // 3. それ以外は常に表示
  return true;
}
