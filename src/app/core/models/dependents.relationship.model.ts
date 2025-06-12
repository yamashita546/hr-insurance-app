export interface RelationshipType {
  code: string; // 例: "01"
  name: string; // 例: "配偶者"
}
export const RELATIONSHIP_TYPES: RelationshipType[] = [
  { code: '01', name: '配偶者' },
  { code: '02', name: '子' },
  { code: '03', name: '父母' },
  { code: '04', name: '祖父母' },
  { code: '05', name: '兄弟姉妹' },
  { code: '06', name: '孫' },
  { code: '07', name: '叔父叔母' },
  { code: '08', name: 'その他' }
];


