// 従業員モデル

import { Timestamp, FieldValue } from '@angular/fire/firestore';
import { Address } from './address.model';

export type InsuranceStatus = {
  isApplicable: boolean;              // 適用対象か
  baseNumber?: string;               // 基礎年金番号
  healthInsuranceSymbol?: string;    // 健康保険記号
  healthInsuranceNumber?: string;    // 健康保険者番号（適用時のみ有効）
  acquisitionDate?: Date;            // 資格取得日
  lossDate?: Date;                   // 喪失日
  acquisitionReported?: boolean;     // 取得手続き済みか
  lossReported?: boolean;            // 喪失届提出済みか
  certificateIssued?: boolean;       // 保険証発行済み（健康保険用）
  certificateCollected?: boolean;     // 保険証回収済み（健康保険用）
  remarks?: string;
};

export type Employee = {
    companyKey: string;
    displayCompanyKey: string;
    employeeId: string;
    insuranceNumber?: string;
    displayEmployeeId?: string;
    officeId: string;
    officeName?: string;
    department?: string;        // 所属部署（任意）
    position?: string;          // 役職（任意）
    employeeType?: string; // 雇用形態
    isStudent?: boolean; // 学生かどうか

    lastName: string;
    firstName: string;
    lastNameKana?: string;
    firstNameKana?: string;
    gender?: string;
    birthday: Date;
    contractStartDate?: Date; // 雇用契約開始日
    contractEndDate?: Date;   // 雇用契約終了日
    resignationReason?: string; // 退職理由
    isResigned?: boolean; // 退職者かどうか
    workStyle?: string; // 勤務形態（フルタイム、パート等）
    myNumber?: string;
    myNumberCollected?: boolean; // マイナンバー収集済みか
    myNumberCollectionDate?: Date; // マイナンバー収集日
    email?: string;
    phoneNumber?: string;
    address?: Address;
    isForeignWorker?: boolean; // 外国人かどうか
    nationality?: string; // 国籍
    residenceStatus?: string; // 在留資格
    emergencyContactName?: string; // 緊急連絡先氏名
    emergencyContactPhone?: string; // 緊急連絡先電話番号
    hasDependents?: boolean;
    dependentsCount?: number; // 扶養人数
    isOverseasAssignment?: boolean; // 海外赴任者かどうか
    overseasAssignmentStartDate?: Date; // 海外赴任開始日
    overseasAssignmentEndDate?: Date; // 海外赴任終了日
    regularWorkDays?: number; // 所定労働日数
    regularWorkHours?: number; // 所定労働時間

    healthInsuranceStatus: InsuranceStatus; // 健康保険
    pensionStatus: InsuranceStatus; // 厚生年金
    
    isCareInsuranceApplicable?: boolean;     //介護保険の適用対象か
    remarks?: string;                       // 備考欄

    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    deletedAt?: Timestamp;

    name: string;  // 氏名を追加
    extraordinaryLeaves?: ExtraordinaryLeave[];
    dependents?: any[];
    transferPlan?: {
      transferDate: string; // YYYY-MM-DD
      targetOfficeId: string;
      targetOfficeName: string;
    } | undefined | FieldValue;
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
  insuranceNumber: '被保険者整理番号',
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
  emergencyContactName: '緊急連絡先氏名',
  emergencyContactPhone: '緊急連絡先電話番号',
  hasDependents: '扶養家族あり',
  dependentsCount: '扶養人数',
  isHealthInsuranceApplicable: '健康保険適用',
  healthInsuranceSymbol: '健康保険記号',
  healthInsuranceNumber: '健康保険者番号',
  acquisitionDate: '資格取得日',
  lossDate: '資格喪失日',
  certificateIssued: '保険証発行済み',
  certificateCollected: '保険証回収済み',
  isPensionApplicable: '厚生年金適用',
  baseNumber: '基礎年金番号',
  pensionAcquisitionDate: '資格取得日',
  pensionLossDate: '資格喪失日',  
  isCareInsuranceApplicable: '介護保険適用',
  remarks: '備考',
  isActive: '有効',
  createdAt: '作成日時',
  updatedAt: '更新日時',
  deletedAt: '削除日時',
  name: '氏名',
  overseasAssignmentStartDate: '海外赴任開始日',
  overseasAssignmentEndDate: '海外赴任終了日',
  regularWorkDays: '所定労働日数',
  regularWorkHours: '所定労働時間',
  isOverseasAssignment: '海外赴任で国外居住',
};
