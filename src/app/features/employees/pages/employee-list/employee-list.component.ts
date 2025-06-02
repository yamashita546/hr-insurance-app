import { Component } from '@angular/core';
import { Router ,RouterModule} from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { Company } from '../../../../core/models/company.model';
import { collection, query, where, getDocs, addDoc, doc, setDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css'
})
export class EmployeeListComponent {
  company: Company | null = null;
  employees: any[] = [];
  fileName: string = '';
  pendingImportData: any[] = [];
  importErrors: string[] = [];

  constructor(
    private userCompanyService: UserCompanyService,
    private firestore: Firestore
  ) {
    this.userCompanyService.company$.subscribe(async (company: Company | null) => {
      this.company = company;
      if (company?.companyKey) {
        await this.loadEmployees(company.companyKey);
      }
    });
  }

  async loadEmployees(companyKey: string) {
    const employeesCol = collection(this.firestore, 'employees');
    const q = query(employeesCol, where('companyKey', '==', companyKey));
    const snap = await getDocs(q);
    this.employees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  showDetail(employee: any) {
    // 詳細表示処理（ダミー）
    alert(`${employee.lastName} ${employee.firstName} の詳細ページへ`);
  }

  onAddEmployee() {
    // 従業員追加処理（ダミー）
    alert('従業員追加ダイアログを開く想定です');
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
    // キャンセルやその他の入力は何もしない
  }

  exportCsv(includeData: boolean) {
    const dependentFields = [
      'lastName', 'firstName', 'lastNameKana', 'firstNameKana',
      'relationship', 'relationshipCode', 'birthday', 'myNumber',
      'isSpouse', 'isChild', 'isDisabled', 'isStudent', 'isLivingTogether',
      'income', 'certificationDate', 'certificationType', 'lossDate', 'remarks', 'isActive'
    ];
    const headers = [
      'companyKey',
      'employeeId', 'lastName', 'firstName', 'lastNameKana', 'firstNameKana', 'gender', 'birthday', 'myNumber',
      'email', 'phoneNumber',
      'address.postalCode', 'address.prefecture', 'address.city', 'address.town', 'address.streetAddress',
      'officeName',
      'displayOfficeId',
      'department', 'position', 'employeeType', 'workStyle', 'contractStartDate', 'contractEndDate', 'resignationReason',
      'healthInsuranceNumber', 'pensionNumber', 'employmentInsuranceNumber',
      'isHealthInsuranceApplicable', 'isPensionApplicable', 'isEmploymentInsuranceApplicable', 'isCareInsuranceApplicable',
      'emergencyContactName', 'emergencyContactRelationship', 'emergencyContactPhone', 'emergencyContactIsActive',
      'hasDependents', 'remarks',
      ...[0,1,2,3].flatMap(i => dependentFields.map(f => `dependents[${i}].${f}`)),
      'foreignWorker.romanName', 'foreignWorker.nationality', 'foreignWorker.residenceStatus', 'foreignWorker.residenceStatusType',
      'foreignWorker.residenceCardNumber', 'foreignWorker.residenceCardExpiry', 'foreignWorker.residenceStatusHistory',
      'foreignWorker.passportNumber', 'foreignWorker.passportExpiry', 'foreignWorker.hasResidenceCardCopy', 'foreignWorker.hasSpecialExemption',
      'foreignWorker.exemptionReason', 'foreignWorker.employmentStartDate', 'foreignWorker.employmentEndDate', 'foreignWorker.hasSpecificActivity',
      'foreignWorker.returnPlannedDate', 'foreignWorker.remarks',
      'isExtraordinaryLeave',
      'extraordinaryLeave.leaveTypeCode', 'extraordinaryLeave.leaveStartDate', 'extraordinaryLeave.leaveEndDate',
      'extraordinaryLeave.returnPlanDate', 'extraordinaryLeave.leaveReason',
      'extraordinaryLeave.isHealthInsuranceExempted', 'extraordinaryLeave.isPensionExempted', 'extraordinaryLeave.isEmploymentInsuranceExempted',
      'extraordinaryLeave.isCareInsuranceExempted', 'extraordinaryLeave.isChildcareLeave', 'extraordinaryLeave.isNursingCareLeave'
    ];

    let rows: string[] = [];
    if (includeData && this.employees.length > 0) {
      // 既存データをCSV行に変換
      for (const emp of this.employees) {
        const row = headers.map(h => {
          // ネスト対応
          if (h.includes('.')) {
            const [parent, child] = h.split('.');
            return emp[parent]?.[child] ?? '';
          } else if (h.startsWith('dependents[')) {
            // dependents[0].lastName など
            const match = h.match(/dependents\\[(\\d+)\\]\\.(.+)/);
            if (match) {
              const idx = +match[1];
              const key = match[2];
              return emp.dependents?.[idx]?.[key] ?? '';
            }
          }
          return emp[h] ?? '';
        });
        rows.push(row.join(','));
      }
    } else {
      // 空のひな型
      const sampleRow = [
        this.company?.companyKey || '',
        ...Array(headers.length - 1).fill('')
      ];
      rows.push(sampleRow.join(','));
    }

    const csv = [headers.join(','), ...rows].join('\r\n');
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
    const headers = lines[0].split(',');
    const data: any[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length !== headers.length) {
        errors.push(`${i+1}行目: 列数が一致しません`);
        continue;
      }
      const row: any = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = cols[j];
      }
      // 必須項目チェック
      if (!row['employeeId']) {
        errors.push(`${i+1}行目: employeeIdが未入力です`);
        continue;
      }
      // 例: 日付形式チェック
      if (row['birthday'] && !/^\d{4}-\d{2}-\d{2}$/.test(row['birthday'])) {
        errors.push(`${i+1}行目: birthdayの日付形式が不正です`);
      }
      // 例: 性別チェック
      if (row['gender'] && !['male','female','other'].includes(row['gender'])) {
        errors.push(`${i+1}行目: genderが不正です`);
      }
      // ...他のバリデーションも追加可...
      data.push(row);
    }
    return { data, errors };
  }

  async confirmImport() {
    if (this.importErrors.length > 0) {
      alert('エラーがあります。修正してください。');
      return;
    }
    // 1. 事前に全オフィスを取得
    const officesCol = collection(this.firestore, `companies/${this.company?.companyKey}/offices`);
    const officesSnap = await getDocs(officesCol);
    const displayOfficeIdToId: { [displayOfficeId: string]: string } = {};
    officesSnap.forEach(docSnap => {
      const data = docSnap.data();
      displayOfficeIdToId[data['displayOfficeId']] = docSnap.id;
    });

    // 2. 既存従業員をemployeeIdでマッピング
    const employeeIdToDocId: { [employeeId: string]: string } = {};
    this.employees.forEach(emp => {
      if (emp.employeeId) employeeIdToDocId[emp.employeeId] = emp.id;
    });

    // 3. 各従業員データにofficeIdを付与して保存
    for (const emp of this.pendingImportData) {
      const officeId = displayOfficeIdToId[emp.displayOfficeId];
      if (officeId) {
        emp.officeId = officeId;
      } else {
        emp.officeId = '';
        console.warn(`displayOfficeId「${emp.displayOfficeId}」に一致する事業所がありません`);
      }

      if (employeeIdToDocId[emp.employeeId]) {
        // 既存 → update（setDoc with merge: true）
        const docRef = doc(this.firestore, 'employees', employeeIdToDocId[emp.employeeId]);
        await setDoc(docRef, emp, { merge: true });
      } else {
        // 新規 → addDoc
        await addDoc(collection(this.firestore, 'employees'), emp);
      }
    }
    alert('インポートが完了しました');
    this.pendingImportData = [];
    this.fileName = '';
    await this.loadEmployees(this.company?.companyKey || '');
  }

  cancelImport() {
    this.pendingImportData = [];
    this.importErrors = [];
    this.fileName = '';
  }
}
