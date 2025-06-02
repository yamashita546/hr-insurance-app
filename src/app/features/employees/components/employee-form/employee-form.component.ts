import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
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
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company, Office } from '../../../../core/models/company.model';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [MatExpansionModule, ReactiveFormsModule, CommonModule,
            MatInputModule, MatSelectModule, MatDatepickerModule, 
            MatNativeDateModule, MatButtonModule, MatTabsModule, RouterModule
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

  get dependents(): FormArray {
    return this.form.get('dependents') as FormArray;
  }

  get foreignWorker(): FormGroup {
    return this.form.get('foreignWorker') as FormGroup;
  }

  get extraordinaryLeave(): FormGroup {
    return this.form.get('extraordinaryLeave') as FormGroup;
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
      hireDate: [''],
      contractStartDate: [''],
      contractEndDate: [''],
      resignationDate: [''],
      resignationReason: [''],
      email: [''],
      phoneNumber: [''],
      address: this.fb.group({
        postalCode: [''],
        prefecture: [''],
        city: [''],
        town: [''],
        streetAddress: ['']
      }),
      healthInsuranceNumber: [''],
      pensionNumber: [''],
      employmentInsuranceNumber: [''],
      isHealthInsuranceApplicable: [false],
      isPensionApplicable: [false],
      isEmploymentInsuranceApplicable: [false],
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
      isExtraordinaryLeave: [false],
      extraordinaryLeave: this.fb.group({
        leaveTypeCode: [''],
        leaveStartDate: [''],
        leaveEndDate: [''],
        returnPlanDate: [''],
        leaveReason: [''],
        isHealthInsuranceExempted: [false],
        isPensionExempted: [false],
        isEmploymentInsuranceExempted: [false],
        isCareInsuranceExempted: [false],
        isChildcareLeave: [false],
        isNursingCareLeave: [false],
      }),
    });

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
      const health = val.isHealthInsuranceApplicable;
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
        if (age >= 40) {
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
      relationship: ['', Validators.required],
      relationshipCode: [''],
      birthday: ['', Validators.required],
      myNumber: [''],
      isSpouse: [false],
      isChild: [false],
      isDisabled: [false],
      isStudent: [false],
      isLivingTogether: [false],
      income: [''],
      certificationDate: [''],
      certificationType: [''],
      lossDate: [''],
      remarks: [''],
      isActive: [true]
    }));
  }

  removeDependent(i: number) {
    this.dependents.removeAt(i);
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
      officeId: this.form.get('officeId')!.value
    };
    try {
      // Firestoreへ保存
      const employeesCollection = collection(this.firestore, 'employees');
      await addDoc(employeesCollection, employee);
      // 保存完了時にlocalStorageをクリア
      localStorage.removeItem(EmployeeFormComponent.FORM_STORAGE_KEY);
      localStorage.removeItem(EmployeeFormComponent.TAB_STORAGE_KEY);
      // 一覧画面へ遷移
      this.router.navigate(['/employee']);
    } catch (error) {
      alert('保存に失敗しました: ' + error);
    }
  }

  getFormValidationErrors(formGroup: FormGroup, parentKey: string = ''): string[] {
    const errors: string[] = [];
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
    this.offices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Office));
  }

  canDeactivate(): boolean {
    if (this.form.dirty) {
      return window.confirm('入力内容が保存されていません。ページを離れますか？');
    }
    return true;
  }
}
