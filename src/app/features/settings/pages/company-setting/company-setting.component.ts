import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { AppUser } from '../../../../core/models/user.model';
import { Company } from '../../../../core/models/company.model';

@Component({
  selector: 'app-company-setting',
  standalone: true,
  imports: [],
  templateUrl: './company-setting.component.html',
  styleUrl: './company-setting.component.css'
})
export class CompanySettingComponent implements OnInit {
  authService = inject(AuthService);
  firestore = inject(Firestore);
  companyInfo: Company | null = null;
  isAdminOrOwner = false;

  async ngOnInit() {
    const companyId = this.authService.currentUser?.companyId;
    // Firestoreから会社情報を取得
    if (companyId) {
      const companyDoc = doc(this.firestore, 'companies', companyId);
      const snap = await getDoc(companyDoc);
      this.companyInfo = snap.data() as Company;
    }
    // ロール判定（admin/ownerのみ編集可能）
    // ここでは仮にカスタムクレームやFirestoreのusersコレクションから取得する想定
    const role = this.authService.currentUser?.role;
    this.isAdminOrOwner = ['admin', 'owner'].includes(role || '');
  }
}
