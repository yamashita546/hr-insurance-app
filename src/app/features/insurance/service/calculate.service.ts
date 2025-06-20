export class InsuranceCalculator {
  /**
   * 健康保険料の計算
   */
  static calcHealthInsurance(stdMonthly: number, totalHealthRate: number, applicable: boolean): number {
    if (!applicable) return 0;
    return stdMonthly * (totalHealthRate / 100);
  }

  /**
   * 健康保険料控除額の計算
   */
  static calcHealthInsuranceDeduction(healthInsurance: number, applicable: boolean): number {
    if (!applicable) return 0;
    const half = healthInsurance / 2;
    const fraction = half - Math.floor(half);
    if (fraction <= 0.5) {
      return Math.floor(half);
    } else {
      return Math.ceil(half);
    }
  }

  /**
   * 厚生年金保険料の計算
   */
  static calcPensionInsurance(stdMonthly: number, pensionRate: number, applicable: boolean): number {
    if (!applicable) return 0;
    return Math.floor(stdMonthly * (pensionRate / 100));
  }

  /**
   * 厚生年金保険料控除額の計算
   */
  static calcPensionDeduction(pension: number, applicable: boolean): number {
    if (!applicable) return 0;
    return Math.floor(pension / 2);
  }

  /**
   * 子ども子育て拠出金の計算
   */
  static calcChildcare(stdMonthly: number, childcareRate: number, applicable: boolean): number {
    if (!applicable) return 0;
    return stdMonthly * (childcareRate / 100);
  }

  /**
   * 会社負担額の計算
   */
  static calcCompanyShare(healthCompany: number, pensionCompany: number, childcare: number): number {
    return healthCompany + pensionCompany + childcare;
  }
}
