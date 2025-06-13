import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StandardMonthlyCheckService {
  /**
   * 標準報酬月額算定の注意喚起メッセージを生成
   * @param salaries 給与データ配列
   * @param bonuses 賞与データ配列
   * @param calculationRows 算出根拠テーブルの行データ
   * @param employee 対象従業員
   * @param decisionType 決定種別
   * @param salaryFromYm 算定期間開始（YYYY-MM）
   * @param salaryToYm 算定期間終了（YYYY-MM）
   */
  generateAttentionMessages(
    salaries: any[],
    bonuses: any[],
    calculationRows: any[],
    employee: any,
    decisionType: string,
    salaryFromYm: string,
    salaryToYm: string
  ): string[] {
    const messages: string[] = [];

    // 1. 実費精算の注意
    const targetSalaries = salaries.filter(s => 
      s.employeeId === employee?.employeeId &&
      s.targetYearMonth >= salaryFromYm &&
      s.targetYearMonth <= salaryToYm
    );

    const salariesWithExpense = targetSalaries.filter(s => s.totalActualExpense > 0);
    if (salariesWithExpense.length > 0) {
      const expenseDetails = salariesWithExpense
        .map(s => `${s.targetYearMonth.split('-')[1]}月に${s.totalActualExpense.toLocaleString()}円`)
        .join('、');
      messages.push(`実費精算（${expenseDetails}）が含まれています。出張旅費等の経費精算は標準報酬月額の算定基礎から除外する必要があります。`);
    }

    // 2. 通勤費の複数月分支給の注意
    const hasMultiMonthCommute = targetSalaries.some(s => 
      s.commuteAllowance > 0 && 
      s.commuteAllowanceMonths && 
      s.commuteAllowanceMonths > 1
    );
    
    if (hasMultiMonthCommute) {
      const multiMonthCommutes = targetSalaries
        .filter(s => s.commuteAllowance > 0 && s.commuteAllowanceMonths > 1)
        .map(s => ({
          month: s.targetYearMonth.split('-')[1],
          amount: s.commuteAllowance,
          months: s.commuteAllowanceMonths
        }));
      
      const details = multiMonthCommutes
        .map(c => `${c.month}月：${c.amount.toLocaleString()}円（${c.months}ヶ月分）`)
        .join('、');
      
      messages.push(`通勤手当の複数月分支給があります（${details}）。月割りした金額を算定基礎に算入してください。`);
    }

    // 3. 賞与4回以上支給の注意
    if (bonuses.length > 0) {
      const targetBonuses = bonuses.filter(b => 
        b.employeeId === employee?.employeeId &&
        b.targetYearMonth >= salaryFromYm &&
        b.targetYearMonth <= salaryToYm
      );

      if (targetBonuses.length >= 4) {
        const bonusMonths = targetBonuses
          .map(b => b.targetYearMonth.split('-')[1] + '月')
          .join('、');
        messages.push(`算定期間中に${targetBonuses.length}回の賞与支給（${bonusMonths}）があります。4回以上の賞与支給がある場合、12ヶ月で除した額を毎月の報酬に加算する必要があります。`);
      }
    }

    // 4. 算定対象外の可能性
    if (decisionType === 'fixed') {
      const year = Number(salaryFromYm.split('-')[0]);
      const june1 = new Date(`${year}-06-01`);
      const june30 = new Date(`${year}-06-30`);

      // 6/1以降の資格取得者
      const acqDateRaw = employee?.healthInsuranceStatus?.acquisitionDate;
      if (acqDateRaw) {
        const acqDate = new Date(acqDateRaw);
        if (!isNaN(acqDate.getTime()) && acqDate >= june1) {
          messages.push(`6月1日以降（${acqDateRaw}）の資格取得者のため、定時決定の対象外となる可能性があります。`);
        }
      }

      // 6/30以前の退職者
      if (employee?.contractEndDate) {
        const endDate = new Date(employee.contractEndDate);
        if (!isNaN(endDate.getTime()) && endDate <= june30) {
          messages.push(`6月30日以前（${employee.contractEndDate}）の退職予定者のため、定時決定の対象外となる可能性があります。`);
        }
      }

      // 6/30以前の喪失者
      const lossDateRaw = employee?.healthInsuranceStatus?.lossDate;
      if (lossDateRaw) {
        const lossDate = new Date(lossDateRaw);
        if (!isNaN(lossDate.getTime()) && lossDate <= june30) {
          messages.push(`6月30日以前（${lossDateRaw}）の資格喪失者のため、定時決定の対象外となる可能性があります。`);
        }
      }
    }

    return messages;
  }
}
