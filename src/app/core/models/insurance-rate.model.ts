// 保険料率モデル

export interface InsuranceRate {
    insuranceType: string; // 協会けんぽ又はそれ以外
    id: string; // UUIDまたは {都道府県コード}_{適用年月} 等
    prefectureCode?: string; // 例: "13"（東京都）
    prefectureName?: string; // 例: "東京都"
    validFrom: string; // 例: '2025-03'（適用開始年月）
    validTo?: string;  // 例: '2026-02'（適用終了年月）
    
    healthInsuranceBaseRate: number;     // 基本保険料率（例: 9.64）
    healthInsuranceSpecificRate: number; // 特定保険料率（例: 0.20）
    healthInsuranceRate: number; // 健康保険料率（例: 9.84）
    healthInsuranceShareRate: number;    // 健康保険折半割合（例: 4.92）
    
    careInsuranceRate?: number;          // 介護保険料率（例: 1.60）※対象者のみ
    careInsuranceShareRate?: number;     // 介護保険折半割合（例: 0.80）
    
    employeePensionInsuranceRate: number;   // 厚生年金保険料率（例: 18.3）
    employeePensionShareRate: number;       // 厚生年金折半割合（例: 9.15）

    updatedAt: Date;
}

