export interface InsuranceType {
    code: string; // 例: "1"
    name: string; // 例: "協会けんぽ"
  }

  export const INSURANCE_TYPES: InsuranceType[] = [
    { code: '1', name: '協会けんぽ' },
    { code: '2', name: 'それ以外' },
  ]