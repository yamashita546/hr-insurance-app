

import { Timestamp } from '@angular/fire/firestore';
import { Prefecture } from './prefecture.model';
import { Address } from './address.model';
import { InsuranceType } from './insurance-type';

// 企業モデル
export type Company = {
    companyId: string;
    companyCode?: string;
    displayId: string;
    name: string;
    industry?: string;
    companyOwner?: string;
    headOfficeAddress?: Address;
    establishmentDate?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isActive: boolean;
  };


  // 事業所モデル
  export interface Office {
    id: string;
    companyId: string;        // 紐付け
    name: string;             // "本社", "大阪営業所"など
    isHeadOffice: boolean;    // 本社フラグ
    address: Address;
    insuranceType: InsuranceType; //適用保険種別
    insurancePrefecture: Prefecture;  //適用保険事業所
    businessCategoryId?: string; // 労災保険用の業種分類
    officeCode?: string;      // 社会保険・労災などの事業所番号
    validFrom: string;
    validTo?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isActive: boolean;
  }
  
