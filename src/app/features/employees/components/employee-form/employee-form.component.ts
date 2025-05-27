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

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [MatExpansionModule, ReactiveFormsModule, CommonModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatTabsModule],
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

  get dependents(): FormArray {
    return this.form.get('dependents') as FormArray;
  }

  get foreignWorker(): FormGroup {
    return this.form.get('foreignWorker') as FormGroup;
  }

  get extraordinaryLeave(): FormGroup {
    return this.form.get('extraordinaryLeave') as FormGroup;
  }

  constructor(private fb: FormBuilder, private firestore: Firestore) {}

  ngOnInit() {
    this.form = this.fb.group({
      employeeId: ['', Validators.required],
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      myNumber: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
      lastNameKana: [''],
      firstNameKana: [''],
      gender: [''],
      birthday: ['', Validators.required],
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
  }

  ngOnDestroy() {
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

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const employee = this.form.value;
    // Firestore登録処理をここに実装予定
    alert('登録データ: ' + JSON.stringify(employee, null, 2));
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
}
