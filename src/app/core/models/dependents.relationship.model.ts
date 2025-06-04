export interface RelationshipType {
  code: string; // 例: "01"
  name: string; // 例: "配偶者"
}
export const RELATIONSHIP_TYPES: RelationshipType[] = [
  { code: '01', name: '配偶者' },
  { code: '02', name: '子' },
  { code: '03', name: '父母' },
  { code: '04', name: 'その他' }
];

export interface CertificationType {
  code: string; // 例: "A"
  name: string; // 例: "A区分"
}
export const CERTIFICATION_TYPES: CertificationType[] = [
  { code: 'A', name: 'A区分' },
  { code: 'B', name: 'B区分' },
  { code: 'C', name: 'C区分' }
];
