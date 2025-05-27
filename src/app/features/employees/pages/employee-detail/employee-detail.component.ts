import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { firstValueFrom } from 'rxjs';
import { PREFECTURES } from '../../../../core/models/prefecture.model';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-detail.component.html',
  styleUrl: './employee-detail.component.css'
})
export class EmployeeDetailComponent implements OnInit {
  employee: any = null;
  editEmployee: any = null;
  isEditMode = false;
  employeeTypes = EMPLOYEE_TYPES;
  workStyleTypes = WORK_STYLE_TYPES;
  genderTypes = GENDER_TYPES;
  extraordinaryLeaveTypes = EXTRAORDINARY_LEAVE_TYPES;
  offices: Office[] = [];
  private docId: string = '';
  companyId = '';
  prefectures = PREFECTURES;

  constructor(
    private route: ActivatedRoute,
    private firestore: Firestore,
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.docId = id || '';
    if (id) {
      const docRef = doc(this.firestore, 'employees', id);
      const snap = await getDoc(docRef);
      this.employee = snap.data();
    }
    // 企業ID取得
    const company = await firstValueFrom(this.userCompanyService.company$);
    this.companyId = company?.companyId || '';
    console.log('companyId:', this.companyId);
    // 企業IDで事業所をサブコレクションから取得
    const officesCol = collection(this.firestore, `companies/${this.companyId}/offices`);
    const officesSnap = await getDocs(officesCol);
    this.offices = officesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Office));
    console.log('offices:', this.offices);
  }

  startEdit() {
    this.isEditMode = true;
    // deep copy
    this.editEmployee = JSON.parse(JSON.stringify(this.employee || {}));
    // 未入力セクションも編集できるように最低限の構造を用意
    if (!this.editEmployee.address) this.editEmployee.address = {};
    if (!this.editEmployee.foreignWorker) this.editEmployee.foreignWorker = {};
    if (!this.editEmployee.extraordinaryLeave) this.editEmployee.extraordinaryLeave = {};
    if (!this.editEmployee.dependents) this.editEmployee.dependents = [];
  }

  cancelEdit() {
    this.isEditMode = false;
    this.editEmployee = null;
  }

  async saveEdit() {
    if (!this.docId) return;
    await this.firestoreService.updateEmployee(this.docId, this.editEmployee);
    this.employee = JSON.parse(JSON.stringify(this.editEmployee));
    this.isEditMode = false;
    this.editEmployee = null;
  }

  canDeactivate(): boolean {
    if (this.isEditMode) {
      return window.confirm('編集中の内容が保存されていません。ページを離れますか？');
    }
    return true;
  }
}
