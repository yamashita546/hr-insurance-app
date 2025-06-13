import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router  ,RouterModule} from '@angular/router';
import { Firestore, doc, getDoc, deleteField } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { FormsModule } from '@angular/forms';
import { EMPLOYEE_TYPES, WORK_STYLE_TYPES } from '../../../../core/models/employee.type';
import { GENDER_TYPES } from '../../../../core/models/gender.type';
import { EXTRAORDINARY_LEAVE_TYPES } from '../../../../core/models/extraordinary.leave';
import { Office } from '../../../../core/models/company.model';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { RELATIONSHIP_TYPES } from '../../../../core/models/dependents.relationship.model';
import { EmployeeTransferHistory } from '../../../../core/models/empoloyee.history';
import { RelationshipNamePipe } from '../../../../core/pipe/relationship.pipe';


@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RelationshipNamePipe],
  templateUrl: './employee-detail.component.html',
  styleUrl: './employee-detail.component.css'
})
export class EmployeeDetailComponent implements OnInit, OnDestroy {
  employee: any = null;
  editEmployee: any = null;
  isEditMode = false;
  employeeTypes = EMPLOYEE_TYPES;
  workStyleTypes = WORK_STYLE_TYPES;
  genderTypes = GENDER_TYPES;
  extraordinaryLeaveTypes = EXTRAORDINARY_LEAVE_TYPES;
  offices: Office[] = [];
  selectedOfficeId: string = '';
  selectedEmployeeId: string = '';
  allEmployees: any[] = [];
  filteredEmployees: any[] = [];
  private docId: string = '';
  companyKey = '';
  prefectures = PREFECTURES;
  private companySub?: Subscription;
  validationErrors: string[] = [];
  saveMessage: string = '';
  relationshipTypes = RELATIONSHIP_TYPES;
  transferPlanDialogOpen = false;
  transferPlan: any = { transferDate: '', targetOfficeId: '', targetOfficeName: '' };
  transferHistory: EmployeeTransferHistory[] = [];
  isUploading = false;

  constructor(
    private route: ActivatedRoute,
    private firestore: Firestore,
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService,
    private router: Router
  ) {}

  async ngOnInit() {
    
    const id = this.route.snapshot.paramMap.get('id');
    this.selectedOfficeId = this.route.snapshot.queryParamMap.get('selectedOfficeId') || '';
    // 1. クエリパラメータ優先
    this.selectedEmployeeId = this.route.snapshot.queryParamMap.get('selectedEmployeeId') || '';
    this.userCompanyService.company$.subscribe(async company => {
      if (company && company.companyKey) {
        this.companyKey = company.companyKey;
        // 事業所一覧
        const officesCol = collection(this.firestore, `companies/${this.companyKey}/offices`);
        const officesSnap = await getDocs(officesCol);
        this.offices = officesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Office));
        // 従業員一覧
        this.allEmployees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey) || [];
        // 2. selectedEmployeeIdがなければ、パスパラメータidで従業員を特定
        if (!this.selectedEmployeeId && id) {
          const emp = this.allEmployees.find(e => e.id === id);
          if (emp) {
            this.selectedEmployeeId = emp.employeeId;
          }
        }
        // filteredEmployeesを初期化
        this.updateFilteredEmployees();
        // selectedEmployeeIdがfilteredEmployeesに含まれていなければ、先頭のemployeeIdをセット
        if (!this.filteredEmployees.some(e => e.employeeId === this.selectedEmployeeId || e.id === this.selectedEmployeeId)) {
          if (this.filteredEmployees.length > 0) {
            this.selectedEmployeeId = this.filteredEmployees[0].employeeId;
          }
        }
        // console.log('[ngOnInit] selectedOfficeId:', this.selectedOfficeId, 'selectedEmployeeId:', this.selectedEmployeeId);
        await this.onEmployeeChange();
        // 履歴取得
        if (this.selectedEmployeeId) {
          this.transferHistory = await this.firestoreService.getEmployeeTransferHistory(this.selectedEmployeeId);
        }
        // 異動予定の自動反映
        this.checkAndApplyTransferPlan();
      }
    });
  }

  ngOnDestroy() {
    this.companySub?.unsubscribe();
  }

  startEdit() {
    // console.log('[startEdit] called');
    this.isEditMode = true;
    // deep copy
    this.editEmployee = JSON.parse(JSON.stringify(this.employee || {}));
    // 未入力セクションも編集できるように最低限の構造を用意
    if (!this.editEmployee.address) this.editEmployee.address = {};
    if (!this.editEmployee.foreignWorker) this.editEmployee.foreignWorker = {};
    if (!this.editEmployee.extraordinaryLeaves) this.editEmployee.extraordinaryLeaves = [];
    if (!this.editEmployee.dependents) this.editEmployee.dependents = [];
    if (!this.editEmployee.healthInsuranceStatus) this.editEmployee.healthInsuranceStatus = {};
    if (!this.editEmployee.pensionStatus) this.editEmployee.pensionStatus = {};
    if (!this.editEmployee.employmentInsuranceStatus) this.editEmployee.employmentInsuranceStatus = {};
  }

  cancelEdit() {
    // console.log('[cancelEdit] called');
    this.isEditMode = false;
    this.editEmployee = null;
  }

  async saveEdit() {
    this.validationErrors = [];
    this.saveMessage = '';
    if (!this.docId) return;
    this.isUploading = true;
    try {
      const health = this.editEmployee.healthInsuranceStatus?.isApplicable;
      const birthday = this.editEmployee.birthday;
      let age = 0;
      if (birthday) {
        const birthDate = new Date(birthday);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      // 1. 健康保険がfalseなのに介護保険がtrue → エラー
      if (!health && this.editEmployee.isCareInsuranceApplicable) {
        alert('健康保険が適用されていない場合、介護保険も適用できません。');
        return;
      }

      // 2. 健康保険がtrue かつ 40歳以上65歳未満なのに介護保険がfalse → アラートで自動修正
      if (health && age >= 40 && age < 65 && !this.editEmployee.isCareInsuranceApplicable) {
        const ok = confirm('この従業員は年齢が40歳以上65歳未満かつ健康保険適用のため、介護保険適用が必要です。\n介護保険を適用して保存してよろしいですか？');
        if (!ok) {
          return;
        }
        this.editEmployee.isCareInsuranceApplicable = true;
      }

      // 3. 健康保険がfalseなら介護保険もfalse（自動修正、アラート不要）
      if (!health) {
        this.editEmployee.isCareInsuranceApplicable = false;
      }

      // 4. それ以外（条件に合致している場合）はアラートなしで保存

      // コード値で保存するための変換処理
      // 雇用形態
      if (this.editEmployee.employeeType) {
        const found = this.employeeTypes.find(t => t.code === this.editEmployee.employeeType || t.name === this.editEmployee.employeeType);
        this.editEmployee.employeeType = found ? found.code : this.editEmployee.employeeType;
      }
      // 勤務形態
      if (this.editEmployee.workStyle) {
        const found = this.workStyleTypes.find(t => t.code === this.editEmployee.workStyle || t.name === this.editEmployee.workStyle);
        this.editEmployee.workStyle = found ? found.code : this.editEmployee.workStyle;
      }
      // 性別
      if (this.editEmployee.gender) {
        const found = this.genderTypes.find(g => g.code === this.editEmployee.gender || g.name === this.editEmployee.gender);
        this.editEmployee.gender = found ? found.code : this.editEmployee.gender;
      }
      // 都道府県
      if (this.editEmployee.address && this.editEmployee.address.prefecture) {
        const found = this.prefectures.find(p => p.code === this.editEmployee.address.prefecture || p.name === this.editEmployee.address.prefecture);
        this.editEmployee.address.prefecture = found ? found.code : this.editEmployee.address.prefecture;
      }
      // 扶養家族の続柄コード
      if (Array.isArray(this.editEmployee.dependents)) {
        const mainKeys = ['lastName', 'firstName', 'birthday', 'income', 'certificationDate'];
        const emptyRows = this.editEmployee.dependents.filter((dep: any) =>
          !mainKeys.some(k => dep[k] && String(dep[k]).trim() !== '')
        );
        if (emptyRows.length > 0) {
          const ok = window.confirm('被扶養者情報の入力が不足しています。\n入力欄を削除して保存しますか？');
          if (!ok) {
            return;
          }
          this.editEmployee.dependents = this.editEmployee.dependents.filter((dep: any) =>
            mainKeys.some(k => dep[k] && String(dep[k]).trim() !== '')
          );
        }
      }

      // バリデーション: 正社員なら社会保険3種のisApplicableがすべてtrueでなければならない
      // console.log('[saveEdit] employeeType:', this.editEmployee.employeeType);
      if (this.editEmployee.employeeType === 'regular') {
        if (!this.editEmployee.healthInsuranceStatus?.isApplicable) {
          this.validationErrors.push('正社員の場合、健康保険適用は必須です');
        }
        if (!this.editEmployee.pensionStatus?.isApplicable) {
          this.validationErrors.push('正社員の場合、厚生年金適用は必須です');
        }
      }
      // console.log('[saveEdit] validationErrors:', this.validationErrors);
      if (this.validationErrors.length > 0) {
        // エラーがあれば編集モードを終了しない
        return;
      }
      // console.log('[saveEdit] updateEmployee実行:', this.docId, this.editEmployee);
      // companyIdがなければ補完
      if (!this.editEmployee.companyId && this.companyKey) {
        this.userCompanyService.company$.subscribe(company => {
          if (company && company.companyId) {
            this.editEmployee.companyId = company.companyId;
          }
        });
      }
      // 事業所名とofficeIdの整合性を必ず保つ
      if (this.editEmployee.officeId && this.offices.length > 0) {
        const office = this.offices.find(o => o.id === this.editEmployee.officeId);
        if (office) {
          this.editEmployee.officeName = office.name;
        }
      }
      await this.firestoreService.updateEmployee(this.docId, this.editEmployee);
      this.employee = JSON.parse(JSON.stringify(this.editEmployee));
      this.isEditMode = false;
      this.editEmployee = null;
      this.saveMessage = '保存が完了しました';
      alert('保存が完了しました');
    } catch (e) {
      alert('保存に失敗しました: ' + e);
    } finally {
      this.isUploading = false;
    }
  }

  canDeactivate(): boolean {
    if (this.isEditMode) {
      return window.confirm('編集中の内容が保存されていません。ページを離れますか？');
    }
    return true;
  }

  addExtraordinaryLeave() {
    if (!this.editEmployee.extraordinaryLeaves) this.editEmployee.extraordinaryLeaves = [];
    this.editEmployee.extraordinaryLeaves.push({
      leaveTypeCode: '',
      leaveStartDate: '',
      leaveEndDate: '',
      returnPlanDate: '',
      leaveReason: '',
      isHealthInsuranceExempted: false,
      isPensionExempted: false,
      isEmploymentInsuranceExempted: false,
      isCareInsuranceExempted: false,
      isChildcareLeave: false,
      isNursingCareLeave: false
    });
  }

  // コード値→名称変換メソッド
  getGenderName(code: string): string {
    const found = this.genderTypes.find(g => g.code === code);
    return found ? found.name : code || '未入力';
  }

  getPrefectureName(code: string): string {
    const found = this.prefectures.find(p => p.code === code || p.name === code);
    return found ? found.name : code || '未入力';
  }

  getEmployeeTypeName(code: string): string {
    const found = this.employeeTypes.find(t => t.code === code || t.name === code);
    return found ? found.name : code || '未入力';
  }

  getWorkStyleName(code: string): string {
    const found = this.workStyleTypes.find(t => t.code === code || t.name === code);
    return found ? found.name : code || '未入力';
  }

  getRelationshipName(code: string): string {
    const found = this.relationshipTypes.find(r => r.code === code);
    return found ? found.name : code || '未入力';
  }


  updateFilteredEmployees() {
    if (this.selectedOfficeId === 'ALL') {
      this.filteredEmployees = this.allEmployees.filter(e => e.isActive !== false);
    } else {
      this.filteredEmployees = this.allEmployees.filter(e => String(e.officeId) === String(this.selectedOfficeId) && e.isActive !== false);
    }
    // employeeIdを明示的にString型に変換
    this.filteredEmployees = this.filteredEmployees.map(e => ({ ...e, employeeId: String(e.employeeId) }));
    this.selectedEmployeeId = String(this.selectedEmployeeId);
    this.filteredEmployees.sort((a, b) => (a.employeeId > b.employeeId ? 1 : -1));
  }

  trackByEmployeeId(index: number, emp: any) {
    return emp.employeeId;
  }

  async onOfficeChange() {
    // console.log('[onOfficeChange] called', this.selectedOfficeId);
    this.updateFilteredEmployees();
    if (this.filteredEmployees.length > 0) {
      this.selectedEmployeeId = this.filteredEmployees[0].employeeId;
      await this.onEmployeeChange();
    }
    // クエリパラメータ更新
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...this.route.snapshot.queryParams,
        selectedOfficeId: this.selectedOfficeId,
        selectedEmployeeId: this.selectedEmployeeId
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  async onEmployeeChange() {
    // console.log('[onEmployeeChange] called', this.selectedEmployeeId);
    this.employee = this.filteredEmployees.find(e => e.employeeId === this.selectedEmployeeId || e.id === this.selectedEmployeeId) || null;
    if (this.employee) {
      // console.log('[onEmployeeChange] employee:', this.employee);
      this.docId = this.employee.id || this.employee.docId || '';
      // console.log('[onEmployeeChange] docId:', this.docId);
      // addressオブジェクトがなければ再構築
      if (!this.employee.address) {
        this.employee.address = {
          postalCode: this.employee['address.postalCode'] || '',
          prefecture: this.employee['address.prefecture'] || '',
          city: this.employee['address.city'] || '',
          town: this.employee['address.town'] || '',
          streetAddress: this.employee['address.streetAddress'] || '',
          buildingName: this.employee['address.buildingName'] || ''
        };
      }
      // companyIdがなければ補完
      if (!this.employee.companyId && this.companyKey) {
        this.userCompanyService.company$.subscribe(company => {
          if (company && company.companyId) {
            this.employee.companyId = company.companyId;
          }
        });
      }
      // 契約終了日を参照して退社済みフラグを設定
      if (this.employee.contractEndDate) {
        const today = new Date();
        const endDate = new Date(this.employee.contractEndDate);
        // 日付部分だけ比較
        if (!isNaN(endDate.getTime()) && endDate < new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)) {
          this.employee.isResigned = true;
        } else {
          this.employee.isResigned = false;
        }
      } else {
        this.employee.isResigned = false;
      }
    }
    this.isEditMode = false;
    this.editEmployee = null;
    // クエリパラメータ更新
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...this.route.snapshot.queryParams,
        selectedOfficeId: this.selectedOfficeId,
        selectedEmployeeId: this.selectedEmployeeId
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    // 履歴取得
    if (this.employee?.employeeId) {
      this.transferHistory = await this.firestoreService.getEmployeeTransferHistory(this.employee.employeeId);
    }
    // 異動予定の自動反映
    this.checkAndApplyTransferPlan();
  }

  onNextEmployee() {
    if (!this.filteredEmployees.length) return;
    const idx = this.filteredEmployees.findIndex(e => e.employeeId === this.selectedEmployeeId);
    const nextIdx = (idx + 1) % this.filteredEmployees.length;
    this.selectedEmployeeId = this.filteredEmployees[nextIdx].employeeId;
    this.onEmployeeChange();
    // クエリパラメータ更新
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...this.route.snapshot.queryParams,
        selectedOfficeId: this.selectedOfficeId,
        selectedEmployeeId: this.selectedEmployeeId
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onPrevEmployee() {
    if (!this.filteredEmployees.length) return;
    const idx = this.filteredEmployees.findIndex(e => e.employeeId === this.selectedEmployeeId);
    const prevIdx = (idx - 1 + this.filteredEmployees.length) % this.filteredEmployees.length;
    this.selectedEmployeeId = this.filteredEmployees[prevIdx].employeeId;
    this.onEmployeeChange();
    // クエリパラメータ更新
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...this.route.snapshot.queryParams,
        selectedOfficeId: this.selectedOfficeId,
        selectedEmployeeId: this.selectedEmployeeId
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onBack() {
    this.router.navigate(['/employees/list']);
  }

  // 健康保険の編集時に介護保険もfalseにする
  onHealthInsuranceChange() {
    if (!this.editEmployee.healthInsuranceStatus?.isApplicable) {
      this.editEmployee.isCareInsuranceApplicable = false;
    }
  }

  openTransferPlanDialog() {
    this.transferPlanDialogOpen = true;
    this.transferPlan = {
      transferDate: '',
      targetOfficeId: '',
      targetOfficeName: ''
    };
  }

  closeTransferPlanDialog() {
    this.transferPlanDialogOpen = false;
  }

  async saveTransferPlan() {
    if (!this.employee) return;
    const targetOffice = this.offices.find(o => o.id === this.transferPlan.targetOfficeId);
    if (!targetOffice) return;
    // 予定を保存
    await this.firestoreService.updateEmployee(this.employee.id, {
      transferPlan: {
        transferDate: this.transferPlan.transferDate,
        targetOfficeId: targetOffice.id,
        targetOfficeName: targetOffice.name
      }
    });
    // 履歴に仮登録（キャンセル時はcancelled=trueで保存）
    await this.firestoreService.addEmployeeTransferHistory({
      employeeId: this.employee.employeeId,
      fromOfficeId: this.employee.officeId,
      fromOfficeName: this.employee.officeName,
      toOfficeId: targetOffice.id,
      toOfficeName: targetOffice.name,
      transferDate: this.transferPlan.transferDate,
      registeredAt: new Date().toISOString(),
      cancelled: false
    });
    alert('異動予定を登録しました');
    window.location.reload();
  }

  async cancelTransferPlan() {
    if (!this.employee?.transferPlan) {
      alert('異動予定がありません');
      return;
    }
    // 履歴にキャンセル記録
    await this.firestoreService.addEmployeeTransferHistory({
      employeeId: this.employee.employeeId,
      fromOfficeId: this.employee.officeId,
      fromOfficeName: this.employee.officeName,
      toOfficeId: this.employee.transferPlan.targetOfficeId,
      toOfficeName: this.employee.transferPlan.targetOfficeName,
      transferDate: this.employee.transferPlan.transferDate,
      registeredAt: new Date().toISOString(),
      cancelled: true
    });
    // 異動予定をFirestoreから削除
    await this.firestoreService.updateEmployee(this.employee.id, { transferPlan: deleteField() });
    alert('異動予定をキャンセルしました');
    window.location.reload();
  }

  async checkAndApplyTransferPlan() {
    if (!this.employee?.transferPlan) {
      // 対象がなければ何もしない
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (this.employee.transferPlan.transferDate && today >= this.employee.transferPlan.transferDate) {
      // 異動予定日になったら自動反映
      await this.firestoreService.updateEmployee(this.employee.id, {
        officeId: this.employee.transferPlan.targetOfficeId,
        officeName: this.employee.transferPlan.targetOfficeName,
        transferPlan: deleteField()
      });
      // 履歴に本登録
      await this.firestoreService.addEmployeeTransferHistory({
        employeeId: this.employee.employeeId,
        fromOfficeId: this.employee.officeId,
        fromOfficeName: this.employee.officeName,
        toOfficeId: this.employee.transferPlan.targetOfficeId,
        toOfficeName: this.employee.transferPlan.targetOfficeName,
        transferDate: this.employee.transferPlan.transferDate,
        registeredAt: new Date().toISOString(),
        cancelled: false
      });
      // ここではリロードしない
      await this.onEmployeeChange();
    }
  }

  async deleteEmployee() {
    if (!this.employee || !this.employee.id) return;
    const ok = window.confirm('本当にこの従業員を削除しますか？\n（この操作は元に戻せません）');
    if (!ok) return;
    try {
      // 論理削除: isActive: false
      await this.firestoreService.updateEmployee(this.employee.id, { isActive: false });
      alert('削除しました');
      this.router.navigate(['/employees/list']);
    } catch (e) {
      alert('削除に失敗しました: ' + e);
    }
  }

  onEditOfficeIdChange() {
    if (!this.editEmployee || !this.editEmployee.officeId) return;
    const office = this.offices.find(o => o.id === this.editEmployee.officeId);
    if (office) {
      this.editEmployee.officeName = office.name;
    }
  }
}
