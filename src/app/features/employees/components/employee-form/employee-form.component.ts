import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl, ValidationErrors } from '@angular/forms';
import { EMPLOYEE_TYPES, WORK_STYLE_TYPES } from '../../../../core/models/employee.type';
import { GENDER_TYPES } from '../../../../core/models/gender.type';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { Firestore } from '@angular/fire/firestore';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { Subscription } from 'rxjs';
import { ForeignWorker } from '../../../../core/models/foreign.workers';
import { EXTRAORDINARY_LEAVE_TYPES } from '../../../../core/models/extraordinary.leave';
import { RouterModule, Router } from '@angular/router';
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company, Office } from '../../../../core/models/company.model';
import { Prefecture, PREFECTURES } from '../../../../core/models/prefecture.model';
import { EMPLOYEE_CSV_FIELD_LABELS } from '../../../../core/models/employee.model';
import { RELATIONSHIP_TYPES } from '../../../../core/models/dependents.relationship.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    MatExpansionModule, ReactiveFormsModule, CommonModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, 
    MatNativeDateModule, MatButtonModule, MatTabsModule, RouterModule,
    FormsModule
  ],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.css'
})
export class EmployeeFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  employeeTypes = EMPLOYEE_TYPES;
  workStyleTypes = WORK_STYLE_TYPES;
  genderTypes = GENDER_TYPES;
  extraordinaryLeaveTypes = EXTRAORDINARY_LEAVE_TYPES;

  selectedTabIndex = 0;
  tabCount = 6; // タブ数

  private autoCareInsuranceSub?: Subscription;

  static readonly FORM_STORAGE_KEY = 'employeeFormData';
  static readonly TAB_STORAGE_KEY = 'employeeFormTabIndex';

  validationErrors: string[] = [];

  companyKey = '';
  companyId = '';
  companyName = '';
  offices: Office[] = [];
  prefectures: Prefecture[] = PREFECTURES;

  nationalities = ['中国', '韓国', 'ベトナム', 'フィリピン', 'ネパール', 'アメリカ', 'ブラジル', 'その他'];
  residenceStatusList = [
    '技術・人文知識・国際業務', '技能実習', '特定技能', '永住者', '家族滞在', '留学', '特定活動', 'その他'
  ];
  residenceStatusTypeList = ['1号', '2号', '3号', 'その他'];

  fileName: string = '';
  pendingImportData: any[] = [];
  importErrors: string[] = [];

  public EMPLOYEE_CSV_FIELD_LABELS = EMPLOYEE_CSV_FIELD_LABELS;

  relationshipTypes = RELATIONSHIP_TYPES;

  duplicateEmployees: any[] = []; // 重複従業員リスト

  expandedIndex: number = -1;

  get dependents(): FormArray {
    return this.form.get('dependents') as FormArray;
  }

  get foreignWorker(): FormGroup {
    return this.form.get('foreignWorker') as FormGroup;
  }

  get extraordinaryLeaves(): FormArray {
    return this.form.get('extraordinaryLeaves') as FormArray;
  }

  get previewKeys(): string[] {
    if (this.pendingImportData.length > 0) {
      return Object.keys(this.pendingImportData[0]);
    }
    return [];
  }

  // 郵便番号分割用
  get postalCodeFirstCtrl() {
    return this.form.get('address.postalCodeFirst');
  }
  get postalCodeLastCtrl() {
    return this.form.get('address.postalCodeLast');
  }

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private router: Router,
    private userCompanyService: UserCompanyService
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      employeeId: ['', Validators.required],
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      myNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{12}$/)]],
      lastNameKana: [''],
      firstNameKana: [''],
      gender: [''],
      birthday: ['', Validators.required],
      officeId: [''],
      officeName: [''],
      department: [''],
      position: [''],
      employeeType: [''],
      workStyle: [''],
      isStudent: [false],
      hireDate: [''],
      contractStartDate: [''],
      contractEndDate: [''],
      resignationDate: [''],
      resignationReason: [''],
      email: ['', [Validators.email]],
      phoneNumber: ['', [Validators.pattern(/^\d+$/)]],
      insuranceNumber: ['', [Validators.pattern(/^[0-9]+$/)]],
      address: this.fb.group({
        postalCodeFirst: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
        postalCodeLast: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
        prefecture: [''],
        city: [''],
        town: [''],
        streetAddress: ['']
      }),
      // 保険情報をInsuranceStatus型で管理
      healthInsuranceStatus: this.fb.group({
        isApplicable: [false],
        healthInsuranceSymbol: [''],
        healthInsuranceNumber: [''],
        insuranceNumber: [''],
        acquisitionDate: [''],
        acquisitionReported: [false],
        lossDate: [''],
        lossReported: [false],
        certificateIssued: [false],
        certificateCollected: [false],
        remarks: ['']
      }),
      pensionStatus: this.fb.group({
        isApplicable: [false],
        insuranceNumber: [''],
        acquisitionDate: [''],
        acquisitionReported: [false],
        lossDate: [''],
        lossReported: [false],
        baseNumber: ['', [Validators.pattern(/^\d{10}$/)]],
        remarks: ['']
      }),
      isCareInsuranceApplicable: [false],
      emergencyContactName: [''],
      emergencyContactRelationship: [''],
      emergencyContactPhone: [''],
      emergencyContactIsActive: [true],
      hasDependents: [false],
      remarks: [''],
      dependents: this.fb.array([]),
      isForeignWorker: [false],
      foreignWorker: this.fb.group({
        romanName: [''],
        nationality: [''],
        residenceStatus: [''],
        residenceStatusType: [''],
        residenceCardNumber: [''],
        residenceCardExpiry: [''],
        residenceStatusHistory: [''],
        passportNumber: [''],
        passportExpiry: [''],
        hasResidenceCardCopy: [false],
        hasSpecialExemption: [false],
        exemptionReason: [''],
        employmentStartDate: [''],
        employmentEndDate: [''],
        hasSpecificActivity: [false],
        returnPlannedDate: [''],
        remarks: [''],
      }),
      extraordinaryLeaves: this.fb.array([]),
      isExtraordinaryLeave: [false],
    }, { validators: fullTimeInsuranceValidator });

    // localStorageからフォーム内容を復元
    const savedForm = localStorage.getItem(EmployeeFormComponent.FORM_STORAGE_KEY);
    if (savedForm) {
      this.form.patchValue(JSON.parse(savedForm));
    } else {
      this.form.reset(); // localStorageがなければフォームをリセット
    }
    // localStorageからタブインデックスを復元
    const savedTab = localStorage.getItem(EmployeeFormComponent.TAB_STORAGE_KEY);
    if (savedTab) {
      this.selectedTabIndex = +savedTab;
    }

    // フォーム変更時にlocalStorageへ保存
    this.form.valueChanges.subscribe(val => {
      localStorage.setItem(EmployeeFormComponent.FORM_STORAGE_KEY, JSON.stringify(val));
    });

    // 介護保険適用の自動判定
    this.autoCareInsuranceSub = this.form.valueChanges.subscribe(val => {
      // 健康保険適用の取得方法を修正
      const health = val.healthInsuranceStatus?.isApplicable;
      const birthday = val.birthday;
      let isCare = false;
      if (health && birthday) {
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        // 40歳以上65歳未満
        if (age >= 40 && age < 65) {
          isCare = true;
        }
      }
      if (this.form.get('isCareInsuranceApplicable')!.value !== isCare) {
        this.form.get('isCareInsuranceApplicable')!.setValue(isCare, { emitEvent: false });
      }
    });

    // 扶養家族ありの場合は1人分デフォルトで追加
    this.form.get('hasDependents')!.valueChanges.subscribe(val => {
      const arr = this.dependents;
      if (val && arr.length === 0) {
        this.addDependent();
      } else if (!val && arr.length > 0) {
        while (arr.length) arr.removeAt(0);
      }
    });

    // 事業所名選択時にofficeIdもセット
    this.form.get('officeName')!.valueChanges.subscribe(name => {
      const office = this.offices.find(o => o.name === name);
      this.form.get('officeId')!.setValue(office ? office.id : '', { emitEvent: false });
    });

    this.userCompanyService.company$.subscribe((company: Company | null) => {
      this.companyKey = company?.companyKey || '';
      this.companyId = company?.companyId || '';
      this.companyName = company?.name || '';
      if (company?.companyKey) {
        this.loadOffices(company.companyKey);
      }
    });

    // 既存のlocalStorage復元処理の後に郵便番号分割
    const address = this.form.get('address');
    if (address && address.get('postalCode')) {
      const postalCode = address.get('postalCode')?.value;
      if (postalCode && typeof postalCode === 'string' && postalCode.includes('-')) {
        const [first, last] = postalCode.split('-');
        address.get('postalCodeFirst')?.setValue(first);
        address.get('postalCodeLast')?.setValue(last);
      }
    }
  }

  ngOnDestroy() {
    // 画面離脱時は必ずlocalStorageを削除
    localStorage.removeItem(EmployeeFormComponent.FORM_STORAGE_KEY);
    localStorage.removeItem(EmployeeFormComponent.TAB_STORAGE_KEY);
    this.autoCareInsuranceSub?.unsubscribe();
  }

  addDependent() {
    this.dependents.push(this.fb.group({
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      lastNameKana: [''],
      firstNameKana: [''],
      relationship: [''],
      relationshipCode: ['', Validators.required],
      birthday: ['', Validators.required],
      myNumber: [''],
      isSpouse: [false],
      isChild: [false],
      isDisabled: [false],
      isStudent: [false],
      isLivingTogether: [false],
      income: [''],
      certificationDate: [''],
      lossDate: [''],
      remarks: [''],
      isActive: [true],
      gender: [''],
    }));
  }

  removeDependent(i: number) {
    this.dependents.removeAt(i);
  }

  addExtraordinaryLeave() {
    this.extraordinaryLeaves.push(this.fb.group({
      leaveTypeCode: [''],
      leaveStartDate: [''],
      leaveEndDate: [''],
      returnPlanDate: [''],
      leaveReason: [''],
      isHealthInsuranceExempted: [false],
      isPensionExempted: [false],
      isCareInsuranceExempted: [false],
    }));
  }

  removeExtraordinaryLeave(i: number) {
    this.extraordinaryLeaves.removeAt(i);
  }

  async onSubmit() {
    this.validationErrors = [];
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.validationErrors = this.getFormValidationErrors(this.form);
      return;
    }
    // companyKeyとofficeIdを従業員データに追加
    const employee = {
      ...this.form.value,
      companyKey: this.companyKey,
      companyId: this.companyId,
      officeId: this.form.get('officeId')!.value
    };
    // 郵便番号を結合
    if (employee.address && employee.address.postalCodeFirst && employee.address.postalCodeLast) {
      employee.address.postalCode = `${employee.address.postalCodeFirst}-${employee.address.postalCodeLast}`;
      delete employee.address.postalCodeFirst;
      delete employee.address.postalCodeLast;
    }
    // healthInsuranceStatusのsymbol, numberをネストで保存
    if (this.form.get('healthInsuranceStatus')) {
      const his = this.form.get('healthInsuranceStatus')!.value;
      employee.healthInsuranceStatus = {
        ...employee.healthInsuranceStatus,
        healthInsuranceSymbol: his.healthInsuranceSymbol ?? '',
        healthInsuranceNumber: his.healthInsuranceNumber ?? '',
      };
    }
    // 基礎年金番号（pensionStatus.baseNumber）は文字列として保存（先頭0も保持）
    if (employee.pensionStatus) {
      if (typeof employee.pensionStatus.baseNumber === 'string' && employee.pensionStatus.baseNumber.length > 0) {
        employee.pensionStatus.baseNumber = employee.pensionStatus.baseNumber.padStart(10, '0');
      } else {
        delete employee.pensionStatus.baseNumber;
      }
    }
    // 被保険者整理番号も保存
    employee.insuranceNumber = this.form.get('insuranceNumber')?.value;
    // 被保険者整理番号の重複チェック
    if (employee.insuranceNumber) {
      const employeesCollection = collection(this.firestore, 'employees');
      const snap = await getDocs(employeesCollection);
      const insuranceNumberExists = snap.docs.find(doc => {
        const data = doc.data();
        return (
          data['companyKey'] === this.companyKey &&
          data['insuranceNumber'] === employee.insuranceNumber
        );
      });
      if (insuranceNumberExists) {
        alert(`被保険者整理番号「${employee.insuranceNumber}」は既に登録されています。`);
        return;
      }
    }
    // genderをコード値に変換
    if (employee.gender) {
      if (employee.gender === 'M') employee.gender = 'male';
      else if (employee.gender === 'F') employee.gender = 'female';
      else if (!['male','female','other'].includes(employee.gender)) employee.gender = 'other';
    }
    // dependentsのgenderも変換
    if (Array.isArray(employee.dependents)) {
      employee.dependents = employee.dependents.map((dep: any) => {
        if (dep.gender === 'M') dep.gender = 'male';
        else if (dep.gender === 'F') dep.gender = 'female';
        else if (dep.gender && !['male','female','other'].includes(dep.gender)) dep.gender = 'other';
        return dep;
      });
    }
    // 既存従業員チェック
    const employeesCollection = collection(this.firestore, 'employees');
    const snap = await getDocs(employeesCollection);
    const exists = snap.docs.find(doc => {
      const data = doc.data();
      return data['companyKey'] === this.companyKey && data['employeeId'] === employee.employeeId;
    });
    if (exists) {
      const data = exists.data();
      const officeName = data['officeName'] || '';
      const lastName = data['lastName'] || '';
      const firstName = data['firstName'] || '';
      alert(`従業員番号${employee.employeeId}はすでに登録されています。（${officeName} ${lastName} ${firstName}）`);
      return;
    }
    try {
      // Firestoreへ保存
      await addDoc(employeesCollection, employee);
      // 保存完了時にlocalStorageをクリア
      localStorage.removeItem(EmployeeFormComponent.FORM_STORAGE_KEY);
      localStorage.removeItem(EmployeeFormComponent.TAB_STORAGE_KEY);
      this.form.markAsPristine(); // dirtyフラグをリセット
      // 一覧画面へ遷移
      this.router.navigate(['/employee']);
    } catch (error) {
      alert('保存に失敗しました: ' + error);
    }
  }

  getFormValidationErrors(formGroup: FormGroup, parentKey: string = ''): string[] {
    const errors: string[] = [];
    // formGroupレベルのエラーも取得
    if (formGroup.errors) {
      if (formGroup.errors['healthInsuranceRequired']) {
        errors.push('正社員の場合、健康保険適用は必須です');
      }
      if (formGroup.errors['pensionRequired']) {
        errors.push('正社員の場合、厚生年金適用は必須です');
      }
    }
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      const label = this.getLabelForControl(key);
      if (control instanceof FormGroup) {
        errors.push(...this.getFormValidationErrors(control, label));
      } else if (control instanceof FormArray) {
        (control.controls as FormGroup[]).forEach((group, idx) => {
          errors.push(...this.getFormValidationErrors(group, `${label}（${idx + 1}人目）`));
        });
      } else if (control && control.invalid) {
        Object.keys(control.errors || {}).forEach(errorKey => {
          errors.push(`${parentKey ? parentKey + ' - ' : ''}${label}：${this.getErrorMessage(errorKey, control.errors![errorKey])}`);
        });
      }
    });
    return errors;
  }

  getLabelForControl(key: string): string {
    const labels: { [key: string]: string } = {
      employeeId: '従業員ID',
      lastName: '姓',
      firstName: '名',
      myNumber: 'マイナンバー',
      lastNameKana: '姓（カナ）',
      firstNameKana: '名（カナ）',
      gender: '性別',
      birthday: '生年月日',
      // 必要に応じて追加
    };
    return labels[key] || key;
  }

  getErrorMessage(errorKey: string, errorValue: any): string {
    switch (errorKey) {
      case 'required': return '必須項目です';
      case 'pattern': return '形式が正しくありません';
      case 'minlength': return `最小文字数は${errorValue.requiredLength}です`;
      case 'maxlength': return `最大文字数は${errorValue.requiredLength}です`;
      default: return '入力内容に誤りがあります';
    }
  }

  goToNextTab() {
    // 扶養家族タブ（index=2）でのみチェック
    if (this.selectedTabIndex === 2) {
      const dependents = this.dependents.controls;
      let hasWarning = false;
      for (const dep of dependents) {
        const isLivingTogether = dep.get('isLivingTogether')?.value;
        const income = Number(dep.get('income')?.value || 0);
        const isDisabled = dep.get('isDisabled')?.value;
        const birthday = dep.get('birthday')?.value;
        const relationshipCode = dep.get('relationshipCode')?.value;

        // 年齢計算
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

        let incomeLimit = 130;
        if (age >= 60 || isDisabled) incomeLimit = 180;

        if (isLivingTogether) {
          if (income >= incomeLimit) {
            hasWarning = true;
            break;
          }
        } else {
          if (income >= incomeLimit) {
            hasWarning = true;
            break;
          }
          // 続柄コードが01～06以外はNG
          if (!['01','02','03','04','05','06'].includes(relationshipCode)) {
            hasWarning = true;
            break;
          }
        }
      }
      if (hasWarning) {
        const proceed = window.confirm('扶養に該当しない可能性があります。操作を続けますか？');
        if (!proceed) return;
      }
    }
    if (this.selectedTabIndex < this.tabCount - 1) {
      this.selectedTabIndex++;
    }
  }

  goToPrevTab() {
    if (this.selectedTabIndex > 0) {
      this.selectedTabIndex--;
    }
  }

  onTabChange(index: number) {
    this.selectedTabIndex = index;
    localStorage.setItem(EmployeeFormComponent.TAB_STORAGE_KEY, index.toString());
  }

  async loadOffices(companyKey: string) {
    const officesCol = collection(this.firestore, `companies/${companyKey}/offices`);
    const snap = await getDocs(officesCol);
    this.offices = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Office))
      .filter(office => office.isActive)
      .sort((a, b) => a.id.localeCompare(b.id, 'ja'));
  }

  canDeactivate(): boolean {
    if (this.form.dirty) {
      return window.confirm('入力内容が保存されていません。ページを離れますか？');
    }
    return true;
  }

  onExportCsv() {
    const result = window.prompt(
      'CSV出力方法を選択してください：\n1: ひな型だけ\n2: 現在のデータを含む\nキャンセル: ダイアログを閉じる',
      '1'
    );
    if (result === '1') {
      this.exportCsv(false);
    } else if (result === '2') {
      this.exportCsv(true);
    }
  }

  async exportCsv(includeData: boolean) {
    const dependentFields = [
      'lastName', 'firstName', 'lastNameKana', 'firstNameKana',
      'relationship', 'relationshipCode', 'birthday', 'myNumber',
      'isSpouse', 'isChild', 'isDisabled', 'isStudent', 'isLivingTogether',
      'income', 'certificationDate', 'lossDate', 'remarks', 'isActive'
    ];
    const headers = [
      'companyKey',
      'employeeId', 'insuranceNumber',
      'lastName', 'firstName', 'lastNameKana', 'firstNameKana', 'gender', 'birthday', 'myNumber',
      'email', 'phoneNumber',
      'address.postalCode', 'address.prefecture', 'address.city', 'address.town', 'address.streetAddress',
      'officeName',
      'displayOfficeId',
      'department', 'position', 'employeeType', 'workStyle', 'contractStartDate', 'contractEndDate', 'resignationReason',
      // 健康保険（ネスト構造）
      'healthInsuranceStatus.isApplicable',
      'healthInsuranceStatus.baseNumber',
      'healthInsuranceStatus.healthInsuranceSymbol',
      'healthInsuranceStatus.healthInsuranceNumber',
      'healthInsuranceStatus.acquisitionDate',
      'healthInsuranceStatus.lossDate',
      'healthInsuranceStatus.acquisitionReported',
      'healthInsuranceStatus.lossReported',
      'healthInsuranceStatus.certificateIssued',
      'healthInsuranceStatus.certificateCollected',
      'healthInsuranceStatus.remarks',
      // 厚生年金（ネスト構造）
      'pensionStatus.isApplicable',
      'pensionStatus.baseNumber',
      'pensionStatus.acquisitionDate',
      'pensionStatus.lossDate',
      'pensionStatus.acquisitionReported',
      'pensionStatus.lossReported',
      'pensionStatus.remarks',
      // 介護保険
      'isCareInsuranceApplicable',
      'emergencyContactName', 'emergencyContactRelationship', 'emergencyContactPhone', 'emergencyContactIsActive',
      'hasDependents', 'remarks',
      ...[0,1,2,3].flatMap(i => dependentFields.map(f => `dependents[${i}].${f}`)),
      'foreignWorker.romanName', 'foreignWorker.nationality', 'foreignWorker.residenceStatus', 'foreignWorker.residenceStatusType',
      'foreignWorker.residenceCardNumber', 'foreignWorker.residenceCardExpiry', 'foreignWorker.residenceStatusHistory',
      'foreignWorker.passportNumber', 'foreignWorker.passportExpiry', 'foreignWorker.hasResidenceCardCopy', 'foreignWorker.hasSpecialExemption',
      'foreignWorker.exemptionReason', 'foreignWorker.employmentStartDate', 'foreignWorker.employmentEndDate', 'foreignWorker.hasSpecificActivity',
      'foreignWorker.returnPlannedDate', 'foreignWorker.remarks',
      ...[0,1,2,3].flatMap(i => dependentFields.map(f => `extraordinaryLeaves[${i}].${f}`)),
    ];
    // 日本語タイトルで出力
    const headerRow = headers.map(key => EMPLOYEE_CSV_FIELD_LABELS[key] || key).join(',');
    let rows: string[] = [];
    if (includeData) {
      // Firestoreから従業員データを取得
      const employeesCol = collection(this.firestore, 'employees');
      const q = this.companyKey ? (await import('firebase/firestore')).query(employeesCol, (await import('firebase/firestore')).where('companyKey', '==', this.companyKey)) : employeesCol;
      const snap = await getDocs(q);
      const employees = snap.docs.map(doc => doc.data());
      for (const emp of employees) {
        const row = headers.map(h => {
          // ネスト対応
          if (h.includes('.')) {
            const [parent, child] = h.split('.');
            return emp[parent]?.[child] ?? '';
          } else if (h.startsWith('dependents[')) {
            const match = h.match(/dependents\[(\d+)\]\.(.+)/);
            if (match) {
              const idx = +match[1];
              const key = match[2];
              return emp['dependents']?.[idx]?.[key] ?? '';
            }
          } else if (h.startsWith('extraordinaryLeaves[')) {
            const match = h.match(/extraordinaryLeaves\[(\d+)\]\.(.+)/);
            if (match) {
              const idx = +match[1];
              const key = match[2];
              return emp['extraordinaryLeaves']?.[idx]?.[key] ?? '';
            }
          }
          // 保険適用フラット→ネスト変換
          if (h === 'isHealthInsuranceApplicable') return emp['healthInsuranceStatus']?.isApplicable ?? '';
          if (h === 'isPensionApplicable') return emp['pensionStatus']?.isApplicable ?? '';
          if (h === 'isCareInsuranceApplicable') return emp['isCareInsuranceApplicable'] ?? '';
          return emp[h] ?? '';
        });
        rows.push(row.join(','));
      }
    } else {
      const sampleRow = [
        this.companyKey || '',
        ...Array(headers.length - 1).fill('')
      ];
      rows.push(sampleRow.join(','));
    }
    const csv = [headerRow, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  onImportCsv(event: any) {
    const file = event.target.files[0];
    this.fileName = file ? file.name : '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      const { data, errors } = this.parseCsv(text);
      this.pendingImportData = data;
      this.importErrors = errors;
    };
    reader.readAsText(file, 'utf-8');
  }

  parseCsv(text: string): { data: any[], errors: string[] } {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { data: [], errors: ['CSVにデータがありません'] };
    const headerRow = lines[0].split(',');
    // 日本語→英語キー変換
    const keyMap = Object.fromEntries(
      Object.entries(EMPLOYEE_CSV_FIELD_LABELS).map(([k, v]) => [v, k])
    );
    const keys = headerRow.map(label => keyMap[label] || label);
    const data: any[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length !== keys.length) {
        errors.push(`${i+1}行目: 列数が一致しません`);
        continue;
      }
      const row: any = {};
      for (let j = 0; j < keys.length; j++) {
        row[keys[j]] = cols[j];
      }
      // 都道府県コード・名称変換
      if (row['address.prefecture']) {
        const pref = PREFECTURES.find(
          p => p.code === row['address.prefecture'] || p.name === row['address.prefecture']
        );
        if (pref) {
          row['address.prefecture'] = pref.code;
        } else {
          errors.push(`${i+1}行目: address.prefecture（${row['address.prefecture']}）が不正です`);
        }
      }
      // 保険適用フラット→ネスト変換
      if ('isHealthInsuranceApplicable' in row) {
        row.healthInsuranceStatus = row.healthInsuranceStatus || {};
        row.healthInsuranceStatus.isApplicable = row.isHealthInsuranceApplicable === 'true' || row.isHealthInsuranceApplicable === true;
      }
      if ('isPensionApplicable' in row) {
        row.pensionStatus = row.pensionStatus || {};
        row.pensionStatus.isApplicable = row.isPensionApplicable === 'true' || row.isPensionApplicable === true;
      }
      if ('isCareInsuranceApplicable' in row) {
        row.isCareInsuranceApplicable = row.isCareInsuranceApplicable === 'true' || row.isCareInsuranceApplicable === true;
      }
      if (!row['employeeId']) {
        errors.push(`${i+1}行目: employeeIdが未入力です`);
        continue;
      }
      if (row['birthday'] && !/^\d{4}-\d{2}-\d{2}$/.test(row['birthday'])) {
        errors.push(`${i+1}行目: birthdayの日付形式が不正です`);
      }
      // 性別コード・名称変換
      if (row['gender']) {
        const gender = GENDER_TYPES.find(
          g => g.code === row['gender'] || g.name === row['gender']
        );
        if (gender) {
          row['gender'] = gender.code;
        } else {
          errors.push(`${i+1}行目: gender（${row['gender']}）が不正です`);
        }
      }
      data.push(row);
    }
    return { data, errors };
  }

  async confirmImport() {
    console.log('--- confirmImport start ---');
    console.log('importErrors:', this.importErrors);
    console.log('duplicateEmployees:', this.duplicateEmployees);
    if (this.importErrors.length > 0) {
      alert('エラーがあります。修正してください。');
      console.log('importErrorsが残っているためreturn');
      return;
    }
    // 1. 事前に全オフィスを取得
    const officesCol = collection(this.firestore, `companies/${this.companyKey}/offices`);
    const officesSnap = await getDocs(officesCol);
    const displayOfficeIdToId: { [displayOfficeId: string]: string } = {};
    officesSnap.forEach(docSnap => {
      const data = docSnap.data();
      displayOfficeIdToId[data['displayOfficeId']] = docSnap.id;
    });

    // 2. 既存従業員リスト取得
    const employeesCol = collection(this.firestore, 'employees');
    const employeesSnap = await getDocs(employeesCol);
    const existingEmployees = employeesSnap.docs.map(docSnap => ({ ...docSnap.data(), _docId: docSnap.id }));

    // 3. 重複チェック
    const toAdd: any[] = [];
    const toUpdate: any[] = [];
    for (const emp of this.pendingImportData) {
      emp.companyId = this.companyId;
      const officeId = displayOfficeIdToId[emp.displayOfficeId];
      if (officeId) {
        emp.officeId = officeId;
      } else {
        emp.officeId = '';
        console.warn(`displayOfficeId「${emp.displayOfficeId}」に一致する事業所がありません`);
      }
      // 保険適用フラット→ネスト変換
      if ('isHealthInsuranceApplicable' in emp) {
        emp.healthInsuranceStatus = emp.healthInsuranceStatus || {};
        emp.healthInsuranceStatus.isApplicable = emp.isHealthInsuranceApplicable === 'true' || emp.isHealthInsuranceApplicable === true;
      }
      // healthInsuranceSymbol, healthInsuranceNumberもネストに格納
      if ('healthInsuranceSymbol' in emp) {
        emp.healthInsuranceStatus = emp.healthInsuranceStatus || {};
        emp.healthInsuranceStatus.healthInsuranceSymbol = emp.healthInsuranceSymbol;
      }
      if ('healthInsuranceNumber' in emp) {
        emp.healthInsuranceStatus = emp.healthInsuranceStatus || {};
        emp.healthInsuranceStatus.healthInsuranceNumber = emp.healthInsuranceNumber;
      }
      if ('isPensionApplicable' in emp) {
        emp.pensionStatus = emp.pensionStatus || {};
        emp.pensionStatus.isApplicable = emp.isPensionApplicable === 'true' || emp.isPensionApplicable === true;
      }
      if ('isCareInsuranceApplicable' in emp) {
        emp.isCareInsuranceApplicable = emp.isCareInsuranceApplicable === 'true' || emp.isCareInsuranceApplicable === true;
      }
      // 重複判定
      const dup = existingEmployees.find(e => ((e as any).companyKey ?? '') === (emp.companyKey ?? '') && ((e as any).employeeId ?? '') === (emp.employeeId ?? ''));
      if (dup) {
        // 既存のduplicateEmployeesに同じemployeeIdがあればそのoverwriteを引き継ぐ
        const existingDup = this.duplicateEmployees.find(d => d.employeeId === emp.employeeId);
        this.duplicateEmployees.push({ ...emp, _docId: dup._docId, overwrite: existingDup ? existingDup.overwrite : false, existing: dup });
      } else {
        toAdd.push(emp);
      }
    }
    console.log('duplicateEmployees after check:', this.duplicateEmployees);
    // 重複があればUIで上書き可否を選択させる
    if (this.duplicateEmployees.length > 0) {
      console.log('重複従業員のoverwrite状態:', this.duplicateEmployees.map(e => e.overwrite));
      if (this.duplicateEmployees.some(e => !e.overwrite)) {
        alert('重複している従業員があります。上書きする場合はチェックを入れてください。');
        console.log('overwriteがfalseの従業員がいるためreturn');
        return;
      }
    }
    // 4. 上書き・新規追加処理
    for (const emp of this.duplicateEmployees) {
      if (emp.overwrite) {
        // マージ処理: 空でない項目のみ上書き
        const updateData: any = {};
        Object.keys(emp).forEach(key => {
          if (key === '_docId' || key === 'overwrite' || key === 'existing') return;
          if (emp[key] !== '' && emp[key] !== null && emp[key] !== undefined) {
            updateData[key] = emp[key];
          }
        });
        updateData.companyId = this.companyId;
        // ネストもマージ
        ['address','healthInsuranceStatus','pensionStatus','foreignWorker'].forEach(groupKey => {
          if (emp[groupKey] && typeof emp[groupKey] === 'object') {
            updateData[groupKey] = { ...emp.existing[groupKey], ...Object.fromEntries(Object.entries(emp[groupKey]).filter(([k,v]) => v !== '' && v !== null && v !== undefined)) };
          }
        });
        const docRef = doc(this.firestore, 'employees', emp._docId);
        console.log('updateDoc:', docRef, updateData);
        await updateDoc(docRef, updateData);
      }
    }
    for (const emp of toAdd) {
      console.log('addDoc:', emp);
      await addDoc(collection(this.firestore, 'employees'), emp);
    }
    alert('インポートが完了しました');
    this.pendingImportData = [];
    this.fileName = '';
    this.duplicateEmployees = [];
    this.importErrors = [];
    console.log('--- confirmImport end ---');
  }

  cancelImport() {
    this.pendingImportData = [];
    this.importErrors = [];
    this.fileName = '';
  }

  onDuplicateOverwriteChange() {
    // すべての重複従業員にoverwriteが付いていればエラーを消す
    const allChecked = this.duplicateEmployees.every(e => e.overwrite);
    const idx = this.importErrors.findIndex(e => e.includes('重複している従業員があります'));
    if (allChecked && idx !== -1) {
      this.importErrors.splice(idx, 1);
    } else if (!allChecked && idx === -1) {
      this.importErrors.push('重複している従業員があります。上書きする場合はチェックを入れてください。');
    }
  }
}

function fullTimeInsuranceValidator(control: AbstractControl): ValidationErrors | null {
  const employeeType = control.get('employeeType')?.value;
  const isFullTime = employeeType === 'fulltime'; // 正社員のコードに合わせて必要なら修正
  if (!isFullTime) return null;
  const health = control.get('healthInsuranceStatus.isApplicable')?.value;
  const pension = control.get('pensionStatus.isApplicable')?.value;
  const errors: any = {};
  if (!health) errors.healthInsuranceRequired = true;
  if (!pension) errors.pensionRequired = true;
  return Object.keys(errors).length ? errors : null;
}
