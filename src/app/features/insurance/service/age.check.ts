import { Employee } from '../../../features/insurance/models/employee.model';

export class AgeCheck {
  /**
   * 健康保険の資格を喪失する年齢（75歳）に到達しているかチェック
   */
  static isHealthLostInMonth(emp: Employee, year: number, month: number): boolean {
    const birthDate = new Date(emp.birthDate);
    const targetDate = new Date(year, month - 1, 1);
    const age = targetDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = targetDate.getMonth() - birthDate.getMonth();
    return age === 75 && monthDiff === 0;
  }

  /**
   * 年金保険の資格を喪失する年齢（70歳）に到達しているかチェック
   */
  static isPensionLostInMonth(emp: Employee, year: number, month: number): boolean {
    const birthDate = new Date(emp.birthDate);
    const targetDate = new Date(year, month - 1, 1);
    const age = targetDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = targetDate.getMonth() - birthDate.getMonth();
    return age === 70 && monthDiff === 0;
  }

  /**
   * 介護保険の対象年齢（40歳以上65歳未満）かチェック
   */
  static isCareApplicableAge(emp: Employee, year: number, month: number): boolean {
    const birthDate = new Date(emp.birthDate);
    const targetDate = new Date(year, month - 1, 1);
    let calculatedAge = targetDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = targetDate.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0) {
      calculatedAge--;
    }
    
    return calculatedAge >= 40 && calculatedAge < 65;
  }
}
