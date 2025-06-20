// 型定義は、実際のモデルに合わせて調整してください
type Employee = any;
type Salary = any;
type StandardMonthlyDecision = any;

/**
 * 標準報酬月額決定処理に関するアラート・確認ダイアログのロジックを集約したクラス
 */
export class StandardMonthlyAlertChecks {

  // --- onDecision メソッド関連 ---

  /**
   * 従業員の必須情報が不足していないかチェック
   * @param employee 従業員情報
   * @returns エラーメッセージ or null
   */
  public static checkMissingEmployeeInfo(employee: Employee | null): string | null {
    if (!employee) return null; // 従業員未選択のアラートは呼び出し元で

    const missingItems: string[] = [];

    if (!employee.employeeType) {
      missingItems.push('雇用形態');
    }
    if (!employee.contractStartDate) {
      missingItems.push('契約開始日');
    }
    if (!employee.healthInsuranceStatus?.acquisitionDate) {
      missingItems.push('資格取得日');
    }

    if (missingItems.length > 0) {
      const missingText = missingItems.join('、');
      return `従業員の基本情報が不足しています。\n（不足項目: ${missingText}）`;
    }

    return null;
  }

  /**
   * 適用開始年月と契約開始年月を比較
   * @returns エラーメッセージ or null
   */
  public static checkContractDate(
    employee: Employee | null,
    startYear: number,
    startMonth: number
  ): string | null {
    if (!employee || !employee.contractStartDate) {
      return null;
    }
    const applyYm = `${startYear}-${String(startMonth).padStart(2, '0')}`;
    const contractDate = new Date(employee.contractStartDate);
    if (!isNaN(contractDate.getTime())) {
      const contractYm = `${contractDate.getFullYear()}-${String(contractDate.getMonth() + 1).padStart(2, '0')}`;
      if (applyYm < contractYm) {
        return '適用開始年月が契約開始年月より前になっています。適用開始年月を正しく設定してください。';
      }
    }
    return null;
  }

  /**
   * 算出根拠年月と適用開始年月を比較
   * @returns エラーメッセージ or null
   */
  public static checkCalculationPeriod(
    startYear: number,
    startMonth: number,
    salaryFromYear: number,
    salaryFromMonth: number,
    salaryToYear: number,
    salaryToMonth: number
  ): string | null {
    const applyYm = `${startYear}-${String(startMonth).padStart(2, '0')}`;
    const salaryFromYm = `${salaryFromYear}-${String(salaryFromMonth).padStart(2, '0')}`;
    const salaryToYm = `${salaryToYear}-${String(salaryToMonth).padStart(2, '0')}`;
    if (salaryFromYm > applyYm || salaryToYm > applyYm) {
      return '算出根拠年月が適用対象年月より未来になっています。算出根拠年月を正しく設定してください。';
    }
    return null;
  }

  /**
   * 給与情報の存在をチェック
   * @returns 確認メッセージ or null
   */
  public static confirmSalaryDataExists(salaryList: Salary[]): string | null {
    if (salaryList.length === 0) {
      return '算出根拠の対象年月に給与情報の登録がありません。\n金額を手入力で操作を続けますか？';
    }
    return null;
  }

  /**
   * 定時算定の非対象理由を生成
   */
  private static getFixedDecisionNonTargetReasons(employee: Employee, startYear: number): string[] {
    const reasons: string[] = [];
    const year = startYear;
    const june1 = new Date(`${year}-06-01`);
    const june30 = new Date(`${year}-06-30`);

    if (!employee.healthInsuranceStatus?.isApplicable) {
      reasons.push('社会保険に加入していません。');
    }

    const acqDateRaw = employee.healthInsuranceStatus?.acquisitionDate;
    if (acqDateRaw) {
      const acqDate = new Date(acqDateRaw);
      if (!isNaN(acqDate.getTime()) && acqDate >= june1) {
        reasons.push(`資格取得日が${year}/06/01以降です。`);
      }
    }

    if (employee.contractEndDate) {
      const endDate = new Date(employee.contractEndDate);
      if (!isNaN(endDate.getTime()) && endDate <= june30) {
        reasons.push(`退職日が${year}/06/30以前です。`);
      }
    }

    const lossDateRaw = employee.healthInsuranceStatus?.lossDate;
    if (lossDateRaw) {
      const lossDate = new Date(lossDateRaw);
      if (!isNaN(lossDate.getTime()) && lossDate <= june30) {
        reasons.push(`資格喪失日が${year}/06/30以前です。`);
      }
    }
    return reasons;
  }

  /**
   * 定時算定の対象者かチェック
   * @returns 確認メッセージ or null
   */
  public static confirmFixedDecisionTarget(employee: Employee, startYear: number): string | null {
    const reasons = this.getFixedDecisionNonTargetReasons(employee, startYear);

    if (reasons.length > 0) {
      const reasonText = reasons.map(r => `- ${r}`).join('\n');
      return `定時算定の非対象者が選択されています。\n\n【理由】\n${reasonText}\n\n続けて操作をしますか？`;
    }

    return null;
  }

  /**
   * 随時改定時に、算出根拠開始月の給与が昇給/降給かチェック
   * @param salary 算出根拠開始月の給与データ
   * @param startYear 算出根拠開始年
   * @param startMonth 算出根拠開始月
   * @returns 確認メッセージ or null
   */
  public static confirmPromotionStatusForOccasional(
    salary: Salary | null,
    startYear: number,
    startMonth: number
  ): string | null {
    if (!salary || (salary.promotion !== 'promotion' && salary.promotion !== 'demotion')) {
      return `${startYear}年${startMonth}月の給与は昇給または降給として登録されていません。\n随時改定の対象として操作をつづけますか？`;
    }
    return null;
  }


  // --- onSave メソッド関連 ---

  /**
   * 随時改定の等級差をチェック
   * @returns 確認メッセージ or null
   */
  public static confirmGradeDifferenceOnOccasional(
    currentDecision: StandardMonthlyDecision | null,
    newGrade: string
  ): string | null {
    if (currentDecision && currentDecision.healthGrade && newGrade) {
      const currentNum = Number(currentDecision.healthGrade);
      const newNum = Number(newGrade);
      if (!isNaN(currentNum) && !isNaN(newNum)) {
        if (Math.abs(newNum - currentNum) < 2) {
          return '新しい等級は現在の等級から2等級以上離れていません。このまま保存しますか？';
        }
      }
    }
    return null;
  }

  /**
   * 育児休業復帰時の等級をチェック
   * @returns 確認メッセージ or null
   */
  public static confirmGradeOnChildcare(
    currentDecision: StandardMonthlyDecision | null,
    newGrade: string
  ): string | null {
    if (currentDecision && currentDecision.healthGrade && newGrade) {
      const currentNum = Number(currentDecision.healthGrade);
      const newNum = Number(newGrade);
      if (!isNaN(currentNum) && !isNaN(newNum)) {
        if (newNum >= currentNum) {
          return '決定種別は正しいですか？（現等級より下がっていません）';
        }
      }
    }
    return null;
  }

  /**
   * 異常値をチェック
   * @returns 確認メッセージ or null
   */
  public static confirmAbnormalValues(row: any): string | null {
    if (!row) return null;
    const abnormal =
      (row.judgedMonthly <= 0 || row.judgedMonthly >= 1000000) ||
      (row.pensionJudgedMonthly <= 0 || row.pensionJudgedMonthly >= 1000000) ||
      (row.salaryAvg <= 0 || row.salaryAvg >= 1000000);
    if (abnormal) {
      return '標準報酬月額または平均月額が異常な値です。本当に保存しますか？';
    }
    return null;
  }

  /**
   * 登録済みデータをチェック
   * @returns エラーメッセージ or null
   */
  public static checkAlreadyRegistered(alreadyRegistered: string[]): string | null {
    if (alreadyRegistered.length > 0) {
        return alreadyRegistered.join('\n');
    }
    return null;
  }
}
