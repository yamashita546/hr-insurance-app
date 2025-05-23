export enum GradeType {
    HEALTH = 'health',
    PENSION = 'pension'
}


// 健康保険標準報酬月額マスタ
export interface HealthInsuranceGrade {
    gradeType: GradeType; // 健康保険 or 厚生年金
    insuranceType: string; // 1: 協会けんぽ, 2: それ以外
    id: string;              // "2025-04_01"
    grade: number;           // 等級番号（1〜50）
    compensation: number;    // 標準報酬月額
    lowerLimit: number;
    upperLimit: number;
    validFrom: string;       // 例: '2025-04'
    validTo?: string;
    updatedAt: Date;
  }
  
// 厚生年金標準報酬月額マスタ
export interface PensionInsuranceGrade {
    gradeType: GradeType; // 健康保険 or 厚生年金
    insuranceType: string; // 1: 協会けんぽ, 2: それ以外
    id: string;              // "2025-04_01"
    grade: number;           // 等級番号（1〜32）
    compensation: number;
    lowerLimit: number;
    upperLimit: number;
    validFrom: string;
    validTo?: string;
    updatedAt: Date;
  }
  