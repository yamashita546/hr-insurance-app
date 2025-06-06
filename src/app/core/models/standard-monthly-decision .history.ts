// 標準報酬月額決定の履歴保存用
import { StandardMonthlyDecision } from './standard-monthly-decision .model';

export interface StandardMonthlyDecisionHistory extends StandardMonthlyDecision {
  operationType: 'edit' | 'delete' | 'create';
  operationAt: Date;
  operatedByUserId: string;
  operatedByUserName: string;
}
