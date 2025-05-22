
// 従業員モデル

import { Timestamp } from '@angular/fire/firestore';


export type Employee = {
    companyId: string;
    employeeId: string;
    department: string;        // 所属部署（任意）
    position?: string;          // 役職（任意）
    employeeType?: 'regular' | 'contract' | 'parttime'; // 雇用形態

    lastName: string;
    firstName: string;
    lastNameKana?: string;
    firstNameKana?: string;
    gender?: string;
    birthday: Date;
    hireDate: Date;
    resignationDate?: Date;
    email: string;
    phoneNumber?: string;
    address?: string;
    postalCode?: string;

    isHealthInsuranceApplicable: boolean;    //健康保険の適用対象か
    isPensionApplicable: boolean;            //厚生年金保険の適用対象か
    isCareInsuranceApplicable?: boolean;     //介護保険の適用対象か
    remarks?: string;                       // 備考欄

    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    deletedAt?: Timestamp;
  };