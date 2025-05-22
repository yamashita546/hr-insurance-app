
// 会社モデル

import { Timestamp } from '@angular/fire/firestore';


export type Company = {
    companyId: string;
    name: string;
    industry?: string;
    address?: string;
    contactEmail?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isActive: boolean;
  };