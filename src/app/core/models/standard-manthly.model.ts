export interface HealthInsuranceGrade {
    id: string;              // "2025-04_01"
    grade: number;           // 等級番号（1〜50）
    compensation: number;    // 標準報酬月額
    lowerLimit: number;
    upperLimit: number;
    validFrom: string;       // 例: '2025-04'
    validTo?: string;
    updatedAt: Date;
  }
  

  export interface PensionInsuranceGrade {
    id: string;              // "2025-04_01"
    grade: number;           // 等級番号（1〜32）
    compensation: number;
    lowerLimit: number;
    upperLimit: number;
    validFrom: string;
    validTo?: string;
    updatedAt: Date;
  }
  