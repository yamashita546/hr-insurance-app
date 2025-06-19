/**
 * 社会保険料の端数処理（0.50円以下切り捨て、0.51円以上切り上げ、0.50は切り捨て）
 */
export function roundSocialInsurance(val: number): number {
    const intPart = Math.floor(val);
    const decimal = val - intPart;
    if (decimal < 0.5) return intPart;
    if (decimal > 0.5) return intPart + 1;
    // ちょうど0.5の場合は切り捨て
    return intPart;
  }
  
  /**
   * 小数点以下が00なら整数、そうでなければ小数第2位まで表示
   */
  export function formatDecimal(val: number): string {
    if (Number.isInteger(val)) return val.toLocaleString();
    const str = val.toFixed(2);
    if (str.endsWith('.00')) return parseInt(str, 10).toLocaleString();
    return Number(str).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } 