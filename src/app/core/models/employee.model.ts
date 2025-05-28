// 従業員モデル

import { Timestamp } from '@angular/fire/firestore';
import { Address } from './address.model';

export type Employee = {
    companyId: string;
    displayCompanyId: string;
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
