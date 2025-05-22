// 保険料率モデル

export interface InsuranceRate {
    id: string; // UUIDまたは {都道府県コード}_{適用年月} 等
    prefectureCode: string; // 例: "13"（東京都）
    prefectureName: string; // 例: "東京都"
    validFrom: Date;        // 例: 2024-03-01（適用開始）
    validTo?: Date;         // 例: null または 2025-02-28（終了日）
    
    healthInsuranceRate: number; // 全体の保険料率（例: 9.84）
    employerShare: number;       // 事業主負担分（例: 4.92）
    employeeShare: number;       // 被保険者負担分（例: 4.92）
    
    careInsuranceRate?: number;   // 介護保険料率（例: 1.60）※対象者のみ
    careEmployerShare?: number;   // 介護保険 事業主負担分
    careEmployeeShare?: number;   // 介護保険 被保険者負担分
    
    updatedAt: Date;
      }
      

