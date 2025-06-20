/**
 * 同一月内に複数支給された賞与を計算用に合算する
 * @param employees 計算対象の従業員リスト
 * @param allBonuses 全賞与データ
 * @param targetYear 対象年
 * @param targetMonth 対象月
 * @returns 計算用に加工された「対象月の」賞与リスト
 */
export function processBonusesForCalculation(
  employees: any[],
  allBonuses: any[],
  targetYear: number,
  targetMonth: number
): any[] {
  const processedBonuses: any[] = [];
  const targetYm = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  employees.forEach(emp => {
    // 各従業員の対象年月の賞与をフィルタリング
    const employeeMonthlyBonuses = allBonuses.filter(
      b => b.employeeId === emp.employeeId && b.targetYearMonth === targetYm
    );

    if (employeeMonthlyBonuses.length > 1) {
      // 複数回支給がある場合、合算する
      const totalBonusAmount = employeeMonthlyBonuses.reduce((sum, b) => sum + (Number(b.bonus) || 0), 0);
      const firstBonus = employeeMonthlyBonuses[0];

      // 合算した新しい単一の賞与オブジェクトを作成
      const aggregatedBonus = {
        ...firstBonus, // 最初のレコードをベースにする
        bonus: totalBonusAmount,
        bonusType: '当月賞与合計',
        bonusName: '当月賞与合計',
        remarks: `同月内 ${employeeMonthlyBonuses.length}回の賞与を合算`,
        isAggregated: true // 集計済みフラグ
      };
      processedBonuses.push(aggregatedBonus);
    } else if (employeeMonthlyBonuses.length === 1) {
      // 1回だけの場合はそのまま追加
      processedBonuses.push(employeeMonthlyBonuses[0]);
    }
  });

  return processedBonuses;
} 