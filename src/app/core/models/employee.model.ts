// 従業員モデル

import { Timestamp } from '@angular/fire/firestore';
import { Address } from './address.model';

export type Employee = {
    companyKey: string;
    displayCompanyKey: string;
    employeeId: string;
    displayEmployeeId?: string;
    officeId: string;
    officeName?: string;
    department?: string;        // 所属部署（任意）
    position?: string;          // 役職（任意）
    employeeType?: string; // 雇用形態

    lastName: string;
    firstName: string;
    lastNameKana?: string;
    firstNameKana?: string;
    gender?: string;
    birthday: Date;
    contractStartDate?: Date; // 雇用契約開始日
    contractEndDate?: Date;   // 雇用契約終了日
    resignationReason?: string; // 退職理由
    workStyle?: string; // 勤務形態（フルタイム、パート等）
    myNumber?: string;
    myNumberCollected?: boolean; // マイナンバー収集済みか
    myNumberCollectionDate?: Date; // マイナンバー収集日
    email?: string;
    phoneNumber?: string;
    address?: Address;
    nationality?: string; // 国籍
    residenceStatus?: string; // 在留資格
    employmentInsuranceNumber?: string; // 雇用保険被保険者番号
    healthInsuranceNumber?: string; // 社会保険被保険者番号
    pensionNumber?: string; // 年金被保険者番号
    emergencyContactName?: string; // 緊急連絡先氏名
    emergencyContactPhone?: string; // 緊急連絡先電話番号
    hasDependents?: boolean;
    dependentsCount?: number; // 扶養人数

    isHealthInsuranceApplicable: boolean;    //健康保険の適用対象か
    isPensionApplicable: boolean;            //厚生年金保険の適用対象か
    isCareInsuranceApplicable?: boolean;     //介護保険の適用対象か
    remarks?: string;                       // 備考欄

    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    deletedAt?: Timestamp;

    name: string;  // 氏名を追加
    extraordinaryLeaves?: ExtraordinaryLeave[];
};

export type Dependent = {
  employeeId: string; // 紐付け用
  lastName: string;
  firstName: string;
  lastNameKana?: string;
  firstNameKana?: string;
  relationship: string; // 続柄
  birthday: Date;
  myNumber?: string;
  isSpouse?: boolean; // 配偶者かどうか
  isChild?: boolean; // 子供かどうか
  isDisabled?: boolean; // 障害者かどうか
  isStudent?: boolean; // 学生かどうか
  isLivingTogether?: boolean; // 同居かどうか
  income?: number; // 年収等
  certificationDate?: Date; // 被扶養者認定日
  certificationType?: string; // 認定区分
  lossDate?: Date; // 資格喪失日
  remarks?: string; // 備考

  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type EmergencyContact = {
  employeeId: string;
  name: string;
  relationship: string;
  phone: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ExtraordinaryLeave = {
  leaveTypeCode: string;
  leaveStartDate: Date;
  leaveEndDate: Date;
  returnPlanDate?: Date;
  leaveReason?: string;
  isHealthInsuranceExempted?: boolean;
  isPensionExempted?: boolean;
  isEmploymentInsuranceExempted?: boolean;
  isCareInsuranceExempted?: boolean;
  isChildcareLeave?: boolean;
  isNursingCareLeave?: boolean;
};

export const EMPLOYEE_CSV_FIELD_LABELS: { [key: string]: string } = {
  companyKey: '企業キー',
  displayCompanyKey: '表示用企業キー',
  employeeId: '従業員ID',
  displayEmployeeId: '表示用従業員ID',
  officeId: '事業所ID',
  officeName: '事業所名',
  department: '部署',
  position: '役職',
  employeeType: '雇用形態',
  lastName: '姓',
  firstName: '名',
  lastNameKana: '姓カナ',
  firstNameKana: '名カナ',
  gender: '性別',
  birthday: '生年月日',
  contractStartDate: '契約開始日',
  contractEndDate: '契約終了日',
  resignationReason: '退職理由',
  workStyle: '勤務形態',
  myNumber: 'マイナンバー',
  myNumberCollected: 'マイナンバー収集済み',
  myNumberCollectionDate: 'マイナンバー収集日',
  email: 'メールアドレス',
  phoneNumber: '電話番号',
  'address.postalCode': '郵便番号',
  'address.prefecture': '都道府県',
  'address.city': '市区町村',
  'address.town': '町域・番地',
  'address.streetAddress': '建物名',
  nationality: '国籍',
  residenceStatus: '在留資格',
  employmentInsuranceNumber: '雇用保険番号',
  healthInsuranceNumber: '健康保険番号',
  pensionNumber: '年金番号',
  emergencyContactName: '緊急連絡先氏名',
  emergencyContactPhone: '緊急連絡先電話番号',
  hasDependents: '扶養家族あり',
  dependentsCount: '扶養人数',
  isHealthInsuranceApplicable: '健康保険適用',
  isPensionApplicable: '厚生年金適用',
  isCareInsuranceApplicable: '介護保険適用',
  remarks: '備考',
  isActive: '有効',
  createdAt: '作成日時',
  updatedAt: '更新日時',
  deletedAt: '削除日時',
  name: '氏名'
};
