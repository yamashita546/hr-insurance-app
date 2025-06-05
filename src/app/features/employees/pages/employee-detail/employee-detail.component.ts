import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router  ,RouterModule} from '@angular/router';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
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
import { RELATIONSHIP_TYPES, CERTIFICATION_TYPES } from '../../../../core/models/dependents.relationship.model';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
  certificationTypes = CERTIFICATION_TYPES;

  constructor(
    private route: ActivatedRoute,
    private firestore: Firestore,
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService,
    private router: Router
  ) {}

  async ngOnInit() {
    console.log('[ngOnInit] start');
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
        console.log('[ngOnInit] selectedOfficeId:', this.selectedOfficeId, 'selectedEmployeeId:', this.selectedEmployeeId);
        await this.onEmployeeChange();
      }
    });
  }

  ngOnDestroy() {
    this.companySub?.unsubscribe();
  }

  startEdit() {
    console.log('[startEdit] called');
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
    console.log('[cancelEdit] called');
    this.isEditMode = false;
    this.editEmployee = null;
  }

  async saveEdit() {
    console.log('[saveEdit] called');
    this.validationErrors = [];
    this.saveMessage = '';
    console.log('[saveEdit] docId:', this.docId);
    if (!this.docId) return;
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

    // 健康保険がfalseなのに介護保険がtrueの場合はエラー
    if (!health && this.editEmployee.isCareInsuranceApplicable) {
      alert('健康保険が適用されていない場合、介護保険も適用できません。');
      return;
    }

    // 健康保険がtrueかつ年齢が40歳以上65歳未満なら確認
    if (health && age >= 40 && age < 65) {
      const ok = confirm('この従業員は年齢が40歳以上65歳未満かつ健康保険適用のため、介護保険適用が必要です。\n介護保険を適用して保存してよろしいですか？');
      if (!ok) {
        return;
      }
      this.editEmployee.isCareInsuranceApplicable = true;
    }

    // 健康保険がfalseなら介護保険もfalseに自動修正
    if (!health) {
      this.editEmployee.isCareInsuranceApplicable = false;
    }

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
      this.editEmployee.dependents = this.editEmployee.dependents.map((dep: any) => {
        if (dep.relationshipCode) {
          const found = RELATIONSHIP_TYPES.find(r => r.code === dep.relationshipCode || r.name === dep.relationshipCode);
          dep.relationshipCode = found ? found.code : dep.relationshipCode;
        }
        return dep;
      });
    }

    // バリデーション: 正社員なら社会保険3種のisApplicableがすべてtrueでなければならない
    console.log('[saveEdit] employeeType:', this.editEmployee.employeeType);
    if (this.editEmployee.employeeType === 'regular') {
      if (!this.editEmployee.healthInsuranceStatus?.isApplicable) {
        this.validationErrors.push('正社員の場合、健康保険適用は必須です');
      }
      if (!this.editEmployee.pensionStatus?.isApplicable) {
        this.validationErrors.push('正社員の場合、厚生年金適用は必須です');
      }
      if (!this.editEmployee.employmentInsuranceStatus?.isApplicable) {
        this.validationErrors.push('正社員の場合、雇用保険適用は必須です');
      }
    }
    console.log('[saveEdit] validationErrors:', this.validationErrors);
    if (this.validationErrors.length > 0) {
      // エラーがあれば編集モードを終了しない
      return;
    }
    console.log('[saveEdit] updateEmployee実行:', this.docId, this.editEmployee);
    await this.firestoreService.updateEmployee(this.docId, this.editEmployee);
    this.employee = JSON.parse(JSON.stringify(this.editEmployee));
    this.isEditMode = false;
    this.editEmployee = null;
    this.saveMessage = '保存が完了しました';
    console.log('[saveEdit] 完了');
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

  getCertificationTypeName(code: string): string {
    const found = this.certificationTypes.find(c => c.code === code);
    return found ? found.name : code || '未入力';
  }

  updateFilteredEmployees() {
    if (this.selectedOfficeId === 'ALL') {
      this.filteredEmployees = [...this.allEmployees];
    } else {
      this.filteredEmployees = this.allEmployees.filter(e => String(e.officeId) === String(this.selectedOfficeId));
    }
    // employeeIdを明示的にString型に変換
    this.filteredEmployees = this.filteredEmployees.map(e => ({ ...e, employeeId: String(e.employeeId) }));
    this.selectedEmployeeId = String(this.selectedEmployeeId);
    console.log('[updateFilteredEmployees] selectedOfficeId:', this.selectedOfficeId, 'allEmployees:', this.allEmployees, 'filteredEmployees:', this.filteredEmployees);
    this.filteredEmployees.sort((a, b) => (a.employeeId > b.employeeId ? 1 : -1));
  }

  trackByEmployeeId(index: number, emp: any) {
    return emp.employeeId;
  }

  async onOfficeChange() {
    console.log('[onOfficeChange] called', this.selectedOfficeId);
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
    console.log('[onEmployeeChange] called', this.selectedEmployeeId);
    this.employee = this.filteredEmployees.find(e => e.employeeId === this.selectedEmployeeId || e.id === this.selectedEmployeeId) || null;
    if (this.employee) {
      console.log('[onEmployeeChange] employee:', this.employee);
      this.docId = this.employee.id || this.employee.docId || '';
      console.log('[onEmployeeChange] docId:', this.docId);
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
}
