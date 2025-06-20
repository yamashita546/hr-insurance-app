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
import { NATIONALITIES } from '../../../../core/models/nationalities';


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
  nationalities = NATIONALITIES;

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
    // 新しい項目も初期化し、保存対象に含める
    this.editEmployee.regularWorkDays = this.editEmployee.regularWorkDays ?? null;
    this.editEmployee.regularWorkHours = this.editEmployee.regularWorkHours ?? null;
    this.editEmployee.isOverseasAssignment = this.editEmployee.isOverseasAssignment ?? false;
    this.editEmployee.overseasAssignmentStartDate = this.editEmployee.overseasAssignmentStartDate ?? '';
    this.editEmployee.overseasAssignmentEndDate = this.editEmployee.overseasAssignmentEndDate ?? '';
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

    // --- バリデーションチェック ---

    // 1. 基本情報の必須チェック
    if (!this.editEmployee.employeeType) {
      this.validationErrors.push('雇用形態は必須です');
    }
    if (!this.editEmployee.contractStartDate) {
      this.validationErrors.push('契約開始日は必須です');
    }

    // 2. 特別休暇のバリデーション
    this.validateExtraordinaryLeaves();

    // 3. 外国人関連のバリデーション
    const isForeignWorker = this.editEmployee.isForeignWorker;
    const hasSpecialExemption = this.editEmployee.foreignWorker?.hasSpecialExemption;
    const nationality = this.editEmployee.foreignWorker?.nationality;
    if (isForeignWorker && hasSpecialExemption && !nationality) {
      this.validationErrors.push('社会保険免除特例がある場合は国籍を選択してください。');
    }

    // 4. 保険適用時の必須項目チェック
    const health = this.editEmployee.healthInsuranceStatus?.isApplicable;
    if (health) {
      if (!this.editEmployee.healthInsuranceStatus?.healthInsuranceSymbol) this.validationErrors.push('健康保険記号は必須です');
      if (!this.editEmployee.healthInsuranceStatus?.healthInsuranceNumber) this.validationErrors.push('健康保険被保険者番号は必須です');
      if (!this.editEmployee.healthInsuranceStatus?.acquisitionDate) this.validationErrors.push('健康保険資格取得日は必須です');
    }
    const pension = this.editEmployee.pensionStatus?.isApplicable;
    if (pension) {
      if (!this.editEmployee.pensionStatus?.baseNumber) this.validationErrors.push('基礎年金番号は必須です');
      if (!this.editEmployee.pensionStatus?.acquisitionDate) this.validationErrors.push('厚生年金資格取得日は必須です');
    }

    // 5. 正社員の社会保険加入バリデーション（年齢考慮）
    const employeeType = this.editEmployee.employeeType;
    if (employeeType === 'regular') {
      const isSpecialExemptionForValidation = this.editEmployee.isForeignWorker === true && this.editEmployee.foreignWorker?.hasSpecialExemption === true;

      if (!isSpecialExemptionForValidation) {
        const birthdayStr = this.editEmployee.birthday;
        const contractStartDateStr = this.editEmployee.contractStartDate;

        if (birthdayStr && contractStartDateStr) {
          const birthday = new Date(birthdayStr);
          const contractStartDate = new Date(contractStartDateStr);

          let age = contractStartDate.getFullYear() - birthday.getFullYear();
          const m = contractStartDate.getMonth() - birthday.getMonth();
          if (m < 0 || (m === 0 && contractStartDate.getDate() < birthday.getDate())) {
            age--;
          }

          const healthApplicable = this.editEmployee.healthInsuranceStatus?.isApplicable;
          const pensionApplicable = this.editEmployee.pensionStatus?.isApplicable;

          if (age < 70) {
            if (!healthApplicable) this.validationErrors.push('70歳未満の正社員は、健康保険の適用が必須です。');
            if (!pensionApplicable) this.validationErrors.push('70歳未満の正社員は、厚生年金の適用が必須です。');
          } else if (age >= 70 && age < 75) {
            if (!healthApplicable) this.validationErrors.push('70歳以上75歳未満の正社員は、健康保険の適用が必須です。');
          }
        }
      }
    }

    // 6. 住所入力のバリデーション
    if (this.editEmployee.address) {
      const { postalCode, prefecture, city, town } = this.editEmployee.address;
      const fields = [postalCode, prefecture, city, town];
      const filledCount = fields.filter((val: any) => val && String(val).trim() !== '').length;
      if (filledCount > 0 && filledCount < fields.length) {
        this.validationErrors.push('住所の入力が不完全です。郵便番号、都道府県、市区町村、町域は、すべて入力してください。');
      }
    }

    // 7. 海外赴任のバリデーション
    if (this.editEmployee.isOverseasAssignment && !this.editEmployee.overseasAssignmentStartDate) {
      this.validationErrors.push('海外赴任で国外居住が有効な場合は、開始日の入力は必須です。');
    }

    // 8. 学生の社会保険加入バリデーション
    if (this.editEmployee.isStudent) {
      if (this.editEmployee.healthInsuranceStatus?.isApplicable || this.editEmployee.pensionStatus?.isApplicable) {
        this.validationErrors.push('学生は社会保険（健康保険・厚生年金）に加入できません。');
      }
    }

    // パート・アルバイトの社会保険適用時の確認アラート
    const isPartOrArubaito = this.editEmployee.employeeType === 'parttime' || this.editEmployee.employeeType === 'parttimejob';
    const healthApplicable = this.editEmployee.healthInsuranceStatus?.isApplicable;
    const pensionApplicable = this.editEmployee.pensionStatus?.isApplicable;
    if (isPartOrArubaito && (healthApplicable || pensionApplicable)) {
      const msg = `短時間労働者の社会保険加入を適用しようとしています。\n条件に適合した社員であるかどうかもう一度ご確認ください。\n\n週の労働時間と月の労働日数が、同じ会社の正社員の4分の3以上ありますか？\n\nもしくは以下のすべてに当てはまりますか？\n\n・従業員数が51人以上の会社である\n・週の労働時間が20時間以上\n・月額の賃金が88,000円以上（※残業代、賞与、交通費は除いて計算）\n・雇用期間が2ヶ月を超える見込み\n・学生ではない`;
      const ok = window.confirm(msg);
      if (!ok) return;
    }

    // バリデーションエラーがあれば処理を中断
    if (this.validationErrors.length > 0) {
      return;
    }

    // --- 確認ダイアログ ---
    if (isForeignWorker && hasSpecialExemption) {
      const ok = window.confirm('社会保険免除特例が有効です。健康保険・厚生年金の適用状況は正しいですか？');
      if (!ok) return;
    }

    this.isUploading = true;
    try {
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
        this.isUploading = false;
        return;
      }

      // 2. 健康保険がtrue かつ 40歳以上65歳未満なのに介護保険がfalse → アラートで自動修正
      if (health && age >= 40 && age < 65 && !this.editEmployee.isCareInsuranceApplicable) {
        const ok = confirm('この従業員は年齢が40歳以上65歳未満かつ健康保険適用のため、介護保険適用が必要です。\n介護保険を適用して保存してよろしいですか？');
        if (!ok) {
          this.isUploading = false;
          return;
        }
        this.editEmployee.isCareInsuranceApplicable = true;
      }

      // 3. 健康保険がfalseなら介護保険もfalse（自動修正、アラート不要）
      if (!health) {
        this.editEmployee.isCareInsuranceApplicable = false;
      }

      // 4. コード値で保存するための変換処理
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
            this.isUploading = false;
            return;
          }
          this.editEmployee.dependents = this.editEmployee.dependents.filter((dep: any) =>
            mainKeys.some(k => dep[k] && String(dep[k]).trim() !== '')
          );
        }
      }
      // ⑤国籍コードで保存、OTHERの場合はnationalityOtherも保存
      if (this.editEmployee.isForeignWorker && this.editEmployee.foreignWorker) {
        const nationalityCode = this.editEmployee.foreignWorker.nationality;
        this.editEmployee.foreignWorker.nationality = nationalityCode;
        if (nationalityCode === 'OTHER') {
          this.editEmployee.foreignWorker.nationalityOther = this.editEmployee.foreignWorker.nationalityOther || '';
        } else {
          this.editEmployee.foreignWorker.nationalityOther = '';
        }
      }
      // ⑥社会保険免除特例がtrueの場合は正社員でも健康保険・厚生年金の必須バリデーションを免除
      if (this.editEmployee.employeeType === 'regular') {
        const isSpecialExemption = this.editEmployee.isForeignWorker && this.editEmployee.foreignWorker?.hasSpecialExemption;
        if (!isSpecialExemption) {
          if (!this.editEmployee.healthInsuranceStatus?.isApplicable) {
            this.validationErrors.push('正社員の場合、健康保険適用は必須です');
          }
          if (!this.editEmployee.pensionStatus?.isApplicable) {
            this.validationErrors.push('正社員の場合、厚生年金適用は必須です');
          }
        }
      }
      if (this.validationErrors.length > 0) {
        return;
      }
      if (!this.editEmployee.companyId && this.companyKey) {
        this.userCompanyService.company$.subscribe(company => {
          if (company && company.companyId) {
            this.editEmployee.companyId = company.companyId;
          }
        });
      }
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

  // extraordinaryLeavesのバリデーション追加
  validateExtraordinaryLeaves() {
    if (Array.isArray(this.editEmployee.extraordinaryLeaves)) {
      this.editEmployee.extraordinaryLeaves.forEach((leave: any, idx: number) => {
        if (leave.leaveStartDate && !leave.leaveEndDate) {
          this.validationErrors.push(`休職${idx + 1}：休職開始日が入力されている場合は休職終了日も入力してください。`);
        }
      });
    }
  }
}