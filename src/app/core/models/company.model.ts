import { Timestamp } from '@angular/fire/firestore';
import { Address } from './address.model';
import { IndustryClassification } from './industry-classification.model';


// 企業モデル
export type Company = {
    companyId: string; // ※自動生成
    corporateNumber?: string; // ※法人番号
    displayId: string; // ※表示・検索用ID
    name: string; // ※企業名
    industry?: string; // ※業種（後々正確な分類に変更できたらよい）
    companyOwner?: string; // ※代表者名
    headOfficeAddress?: Address; // ※本社所在地
    establishmentDate?: string; // ※設立日
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isActive: boolean;
  };


  // 事業所モデル
  export interface Office {
    id: string;//※自動生成
    displayOfficeId: string; // 表示用事業所ID（例: 13-0001-01）
    companyId: string;        // ※紐付け
    name: string;             // "本社", "大阪営業所"など
    isHeadOffice: boolean;    // ※本社フラグ
    address: Address;
    insuranceType: string; // コード値で保存
    insurancePrefecture: string; // コード値で保存
    industryClassification?: IndustryClassification; // 業種分類
    businessCategoryId?: string; // 労災保険用の業種分類
    officeCode?: string;      // 社会保険・労災などの事業所番号
    validFrom: string;
    validTo?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isActive: boolean;
  }
  
