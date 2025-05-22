// 会社モデル


import { Timestamp } from '@angular/fire/firestore';
import { Prefecture } from './prefecture.model';

export type Company = {
    companyId: string;
    name: string;
    industry?: string;
    address?: string;
    prefecture?: Prefecture;
    isBranch?: boolean;
    branchName?: string;
    branchAddress?: string;
    branchPrefecture?: Prefecture;
    contactEmail?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isActive: boolean;
  };