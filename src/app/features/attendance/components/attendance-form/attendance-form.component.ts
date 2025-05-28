import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Employee } from '../../../../core/models/employee.model';
import { Attendance, ATTENDANCE_COLUMN_ORDER, ATTENDANCE_COLUMN_LABELS } from '../../../../core/models/attendance.model';
import { Office } from '../../../../core/models/company.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-attendance-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './attendance-form.component.html',
  styleUrl: './attendance-form.component.css'
})
export class AttendanceFormComponent implements OnInit {
  @Output() formSaved = new EventEmitter<void>();
  @Output() formCancel = new EventEmitter<void>();

  form!: FormGroup;
  employees: Employee[] = [];
  offices: Office[] = [];
  filteredEmployees: { [officeId: string]: Employee[] } = {};
  companyId: string = '';
  ATTENDANCE_COLUMN_ORDER = ATTENDANCE_COLUMN_ORDER;
  ATTENDANCE_COLUMN_LABELS = ATTENDANCE_COLUMN_LABELS;

  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService
  ) {
    this.initForm();
  }

  async ngOnInit() {
    const company = await firstValueFrom(this.userCompanyService.company$);
    console.log('取得したcompany:', company);
    if (company) {
      this.companyId = company.companyId;
      this.offices = await this.firestoreService.getOffices(company.companyId);
      console.log('取得したoffices:', this.offices);
      this.employees = await this.firestoreService.getEmployeesByCompanyId(company.companyId);
      console.log('取得したemployees:', this.employees);
      this.offices.forEach(office => {
        this.filteredEmployees[office.id] = this.employees.filter(
          emp => emp.officeId === office.id
        );
      });
      console.log('filteredEmployees:', this.filteredEmployees);
    }
  }

  private initForm() {
    this.form = this.fb.group({
      attendances: this.fb.array([])
    });
    this.addRow();
  }

  get attendances(): FormArray<FormGroup> {
    return this.form.get('attendances') as FormArray<FormGroup>;
  }

  addRow() {
    this.attendances.push(this.fb.group({
      year: ['', Validators.required],
      month: ['', Validators.required],
      officeId: [''],
      officeName: [''],
      employeeId: [''],
      employeeName: [''],
      scheduledWorkDays: [''],
      actualWorkDays: [''],
      scheduledWorkHours: [''],
      actualWorkHours: [''],
      absentDays: [''],
      leaveWithoutPayDays: [''],
      paidLeaveDays: [''],
      childCareLeaveStartDate: [''],
      childCareLeaveEndDate: [''],
      familyCareLeaveStartDate: [''],
      familyCareLeaveEndDate: [''],
      injuryOrSicknessLeaveStartDate: [''],
      injuryOrSicknessLeaveEndDate: [''],
      isOnFullLeaveThisMonth: [false],
      companyId: [this.companyId]
    }));
  }

  removeRow(i: number) {
    this.attendances.removeAt(i);
  }

  onOfficeChange(index: number) {
    const group = this.attendances.at(index);
    const officeId = group.get('officeId')?.value;
    const office = this.offices.find(o => o.id === officeId);
    
    if (office) {
      group.patchValue({
        officeName: office.name,
        employeeId: '',
        employeeName: ''
      });
    }
  }

  onEmployeeChange(index: number) {
    const group = this.attendances.at(index);
    const employeeId = group.get('employeeId')?.value;
    const employee = this.employees.find(emp => emp.employeeId === employeeId);
    
    if (employee) {
      const office = this.offices.find(o => o.id === employee.officeId);
      group.patchValue({
        officeId: employee.officeId,
        officeName: office?.name || '',
        employeeName: this.getEmployeeFullName(employee)
      });
    }
  }

  onEmployeeNameChange(index: number) {
    const group = this.attendances.at(index);
    const employeeName = group.get('employeeName')?.value;
    const employee = this.employees.find(emp => this.getEmployeeFullName(emp) === employeeName);
    
    if (employee) {
      const office = this.offices.find(o => o.id === employee.officeId);
      group.patchValue({
        officeId: employee.officeId,
        officeName: office?.name || '',
        employeeId: employee.employeeId
      });
    }
  }

  getOfficeEmployees(officeId: string): Employee[] {
    return this.filteredEmployees[officeId] || [];
  }

  async onSubmit() {
    if (this.form.invalid) return;
    for (const group of this.attendances.controls) {
      const data = { ...group.value, companyId: this.companyId };
      await this.firestoreService.addAttendance(data);
    }
    alert('保存しました');
    this.form.reset();
    while (this.attendances.length > 0) this.attendances.removeAt(0);
    for (let i = 0; i < 3; i++) this.addRow();
    this.formSaved.emit();
  }

  onCancel() {
    this.formCancel.emit();
  }

  getEmployeeFullName(emp: Employee): string {
    return emp.lastName + emp.firstName;
  }
}
