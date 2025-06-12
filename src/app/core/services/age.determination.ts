/**
 * 生年月日と到達年齢から、その年齢に到達する日付（誕生日の前日）を返す
 * @param birthday 生年月日（YYYY-MM-DD形式の文字列）
 * @param targetAge 到達年齢（例: 40, 65）
 * @returns Date 到達日（誕生日の前日）
 */
export function getAgeArrivalDate(birthday: string, targetAge: number): Date | null {
  if (!birthday || typeof targetAge !== 'number') return null;
  const [year, month, day] = birthday.split('-').map(Number);
  if (!year || !month || !day) return null;
  // 誕生日の前日
  const arrival = new Date(year + targetAge, month - 1, day);
  arrival.setDate(arrival.getDate() - 1);
  return arrival;
}

/**
 * 40歳、65歳、70歳、75歳の到達日（誕生日の前日）をまとめて返す
 * @param birthday 生年月日（YYYY-MM-DD形式の文字列）
 * @returns { [age: number]: Date | null }
 */
export function getAllAgeArrivalDates(birthday: string): { [age: number]: Date | null } {
  const ages = [40, 65, 70, 75];
  const result: { [age: number]: Date | null } = {};
  for (const age of ages) {
    result[age] = getAgeArrivalDate(birthday, age);
  }
  return result;
}
