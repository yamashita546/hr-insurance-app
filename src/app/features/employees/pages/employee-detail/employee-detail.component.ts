import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { firstValueFrom, Subscription } from 'rxjs';
import { PREFECTURES } from '../../../../core/models/prefecture.model';
import { RELATIONSHIP_TYPES, CERTIFICATION_TYPES } from '../../../../core/models/dependents.relationship.model';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    private userCompanyService: UserCompanyService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.docId = id || '';
    if (id) {
      const docRef = doc(this.firestore, 'employees', id);
      const snap = await getDoc(docRef);
      this.employee = snap.data();
      console.log('取得したemployee:', this.employee);
      if (this.employee) {
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
          console.log('再構築したemployee.address:', this.employee.address);
        }
        if (this.employee.address) {
          console.log('employee.address:', this.employee.address);
          // 各フィールドも個別に出力
          console.log('address.postalCode:', this.employee.address.postalCode);
          console.log('address.prefecture:', this.employee.address.prefecture);
          console.log('address.city:', this.employee.address.city);
          console.log('address.town:', this.employee.address.town);
          console.log('address.streetAddress:', this.employee.address.streetAddress);
          console.log('address.buildingName:', this.employee.address.buildingName);
        } else {
          console.log('employee.addressが存在しません');
        }
      }
    }

    // company$をsubscribeして、値が取得できたら処理を進める
    this.companySub = this.userCompanyService.company$.subscribe(async company => {
      if (company && company.companyKey) {
        this.companyKey = company.companyKey;
        console.log('companyKey:', this.companyKey);
        const officesCol = collection(this.firestore, `companies/${this.companyKey}/offices`);
        const officesSnap = await getDocs(officesCol);
        this.offices = officesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Office));
        console.log('offices:', this.offices);
      }
    });
  }

  ngOnDestroy() {
    this.companySub?.unsubscribe();
  }

  startEdit() {
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
    this.isEditMode = false;
    this.editEmployee = null;
  }

  async saveEdit() {
    this.validationErrors = [];
    this.saveMessage = '';
    if (!this.docId) return;
    // 介護保険適用の自動判定
    const health = this.editEmployee.healthInsuranceStatus?.isApplicable;
    const birthday = this.editEmployee.birthday;
    let isCare = false;
    if (health && birthday) {
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age >= 40 && age < 65) {
        isCare = true;
      }
    }
    this.editEmployee.isCareInsuranceApplicable = isCare;

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
          const rels = [
            { code: '01', name: '配偶者' },
            { code: '02', name: '子' },
            { code: '03', name: '父母' },
            { code: '04', name: 'その他' }
          ];
          const found = rels.find(r => r.code === dep.relationshipCode || r.name === dep.relationshipCode);
          dep.relationshipCode = found ? found.code : dep.relationshipCode;
        }
        return dep;
      });
    }

    // バリデーション: 正社員なら社会保険3種のisApplicableがすべてtrueでなければならない
    if (this.editEmployee.employeeType === '正社員') {
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
    if (this.validationErrors.length > 0) {
      // エラーがあれば編集モードを終了しない
      return;
    }
    await this.firestoreService.updateEmployee(this.docId, this.editEmployee);
    this.employee = JSON.parse(JSON.stringify(this.editEmployee));
    this.isEditMode = false;
    this.editEmployee = null;
    this.saveMessage = '保存が完了しました';
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
}
