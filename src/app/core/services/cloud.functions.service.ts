import { Injectable } from '@angular/core';
import { getFunctions, httpsCallable } from 'firebase/functions';

@Injectable({ providedIn: 'root' })
export class CloudFunctionsService {
  private functions = getFunctions();

  // 管理者によるユーザー作成
  async createUserByAdmin(data: {
    email: string;
    password: string;
    displayName: string;
    companyKey: string;
    userId: string;
    role: string;
    initialPassword?: string;
  }): Promise<any> {
    const fn = httpsCallable(this.functions, 'createUserByAdmin');
    return fn(data);
  }

  // 管理者によるユーザー情報更新
  async updateUserByAdmin(data: {
    uid: string;
    email?: string;
    password?: string;
    displayName?: string;
  }): Promise<any> {
    const fn = httpsCallable(this.functions, 'updateUserByAdmin');
    return fn(data);
  }
}

