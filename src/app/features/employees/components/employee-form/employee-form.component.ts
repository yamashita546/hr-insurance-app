import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [MatExpansionModule, ReactiveFormsModule, CommonModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.css'
})
export class EmployeeFormComponent implements OnInit {
  form!: FormGroup;
  employeeTypes = EMPLOYEE_TYPES;
  workStyleTypes = WORK_STYLE_TYPES;
  genderTypes = GENDER_TYPES;

  get dependents(): FormArray {
    return this.form.get('dependents') as FormArray;
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
      isCareInsuranceApplicable: [false],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      hasDependents: [false],
      remarks: [''],
      dependents: this.fb.array([])
    });
  }

  addDependent() {
    this.dependents.push(this.fb.group({
      name: ['', Validators.required],
      relation: ['', Validators.required]
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
}
