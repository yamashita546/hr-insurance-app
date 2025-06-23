import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { InsuranceSalaryCalculation, InsuranceBonusCalculation } from '../../../../core/models/insurance-calculation.model';
import { UserCompanyService } from '../../../../core/services/user-company.service';
import { filter, take } from 'rxjs/operators';
import { isEmployeeSelectable } from '../../../../core/services/empoloyee.active';

@Component({
  selector: 'app-insurance-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './insurance-list.component.html',
  styleUrl: './insurance-list.component.css'
})
export class InsuranceListComponent implements OnInit {
  resultList: any[] = [];
  selectedType: 'salary' | 'bonus' = 'salary';

  salaryList: InsuranceSalaryCalculation[] = [];
  bonusList: InsuranceBonusCalculation[] = [];
  companyKey: string = '';
  offices: any[] = [];
  employees: any[] = [];

  selectedOfficeId: string = '';
  selectedEmployeeId: string = '';
  selectedYear: number | '' = new Date().getFullYear();
  selectedMonth: number | '' = new Date().getMonth() + 1;

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  get filteredEmployees() {
    let result = this.employees.filter(emp =>
      isEmployeeSelectable(emp, this.selectedYear?.toString(), this.selectedMonth?.toString())
    );
    if (this.selectedOfficeId) {
      result = result.filter(emp => emp.officeId === this.selectedOfficeId);
    }
    return result;
  }

  get activeOffices() {
    return this.offices.filter(o => o.isActive !== false);
  }

  get summary() {
    if (!this.resultList || this.resultList.length === 0) return {};
    // デバッグ用: resultListの中身を出力
    // console.log('【DEBUG】resultList:', this.resultList);
    // 給与・賞与で合計するフィールドを分ける
    const salaryFields = [
      'salaryTotal', 'healthInsurance', 'healthInsuranceDeduction', 'careInsuranceMonthly', 'careInsuranceDeduction', 'pension',
      'pensionDeduction', 'deductionTotal', 'childcare', 'companyShare'
    ];
    const bonusFields = [
      'bonus', 'standardBonus', 'annualBonusTotal', 'healthInsurance',
      'healthInsuranceDeduction', 'careInsuranceMonthly', 'careInsuranceDeduction', 'pension', 'pensionDeduction',
      'deductionTotal', 'childcare', 'companyShare'
    ];
    const fields = this.selectedType === 'salary' ? salaryFields : bonusFields;
    const sum: any = {};
    for (const field of fields) {
      // デバッグ用: 各フィールドの値を出力
      const values = this.resultList.map(row => row[field]);
      // console.log(`【DEBUG】field: ${field}, values:`, values);
      sum[field] = values
        .map(val => typeof val === 'string' ? Number(val.toString().replace(/,/g, '')) : Number(val) || 0)
        .reduce((a, b) => a + b, 0);
    }
    return sum;
  }

  constructor(
    private firestoreService: FirestoreService,
    private userCompanyService: UserCompanyService
  ) {}

  async ngOnInit() {
    this.userCompanyService.company$
      .pipe(filter(company => !!company && !!company.companyKey), take(1))
      .subscribe(async company => {
        this.companyKey = company!.companyKey;
        this.offices = await this.firestoreService.getOffices(this.companyKey);
        this.employees = await this.firestoreService.getEmployeesByCompanyKey(this.companyKey);
        // Firestoreから給与・賞与計算結果を取得（companyKeyで絞り込み）
        const [salarySnap, bonusSnap] = await Promise.all([
          (await this.firestoreService.getInsuranceSalaryCalculations()).filter((c: any) => c.companyKey === this.companyKey),
          (await this.firestoreService.getInsuranceBonusCalculations()).filter((c: any) => c.companyKey === this.companyKey)
        ]);
        this.salaryList = salarySnap;
        this.bonusList = bonusSnap;
        // console.log('salaryList:', this.salaryList);
        // console.log('bonusList:', this.bonusList);
        this.updateResultList();
        // console.log('resultList:', this.resultList);
      });
  }

  updateResultList() {
    const sourceList = this.selectedType === 'salary' ? this.salaryList : this.bonusList;
    // 支社・従業員・年月でフィルタ
    const filtered = sourceList.filter(row => {
      // 従業員データが存在しない、またはisActiveがfalseなら除外
      const emp = this.employees.find(e => e.employeeId === row.employeeId);
      if (!emp || emp.isActive === false) return false;
      const officeMatch = !this.selectedOfficeId || row.officeId === this.selectedOfficeId;
      const empMatch = !this.selectedEmployeeId || row.employeeId === this.selectedEmployeeId;
      let ymMatch = true;
      if (this.selectedYear && this.selectedMonth) {
        const ym = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}`;
        ymMatch = !row.applyYearMonth || row.applyYearMonth === ym;
      } else if (this.selectedYear && !this.selectedMonth) {
        ymMatch = !!row.applyYearMonth && row.applyYearMonth.startsWith(`${this.selectedYear}-`);
      } else if (!this.selectedYear && this.selectedMonth) {
        ymMatch = !!row.applyYearMonth && row.applyYearMonth.endsWith(`-${String(this.selectedMonth).padStart(2, '0')}`);
      }
      return officeMatch && empMatch && ymMatch;
    });
    // 同じ従業員・支社・年月の組み合わせで最新の1件だけ残す
    const uniqueMap = new Map<string, any>();
    for (const row of filtered) {
      const key = `${row.employeeId}_${row.officeId}_${row.applyYearMonth}`;
      const prev = uniqueMap.get(key);
      if (!prev || new Date(row.updatedAt).getTime() > new Date(prev.updatedAt).getTime()) {
        uniqueMap.set(key, row);
      }
    }
    const uniqueList = Array.from(uniqueMap.values());
    // 支社名→従業員名の昇順でソート
    let sorted = [...uniqueList].sort((a, b) => {
      const officeA = this.offices.find(o => o.id === a.officeId)?.name || '';
      const officeB = this.offices.find(o => o.id === b.officeId)?.name || '';
      if (officeA !== officeB) return officeA.localeCompare(officeB, 'ja');
      const empA = this.employees.find(e => e.employeeId === a.employeeId);
      const empB = this.employees.find(e => e.employeeId === b.employeeId);
      const nameA = empA ? `${empA.lastName} ${empA.firstName}` : '';
      const nameB = empB ? `${empB.lastName} ${empB.firstName}` : '';
      return nameA.localeCompare(nameB, 'ja');
    });
    // ソートカラム指定時はそのカラムでソート
    if (this.sortColumn) {
      sorted = sorted.sort((a, b) => {
        let valA = a[this.sortColumn];
        let valB = b[this.sortColumn];
        // 数値文字列は数値比較
        if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
          valA = Number(valA);
          valB = Number(valB);
        }
        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';
        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    this.resultList = sorted.map(row => {
      const officeName = this.offices.find(o => o.id === row.officeId)?.name || '';
      const emp = this.employees.find(e => e.employeeId === row.employeeId);
      const employeeName = emp ? `${emp.lastName} ${emp.firstName}` : row.employeeId;
      const careInsurance = row.careInsurance === true ? '〇' : row.careInsurance === false ? '×' : 'ー';
      // 数値はカンマ区切り、未定義は「ー」
      const format = (v: any) => (v === undefined || v === null || v === '' || isNaN(v)) ? 'ー' : Number(v).toLocaleString();
      if (this.selectedType === 'salary') {
        return {
          officeName,
          employeeId: row.employeeId,
          employeeName,
          careInsurance,
          salaryTotal: format((row as any).salaryTotal),
          grade: (row as any).healthGrade || 'ー',
          monthly: format((row as any).healthMonthly),
          healthInsurance: format((row as any).healthInsurance),
          healthInsuranceDeduction: format((row as any).healthInsuranceDeduction),
          careInsuranceMonthly: format((row as any).careInsuranceMonthly),
          careInsuranceDeduction: format((row as any).careInsuranceDeduction),
          pension: format((row as any).pension),
          pensionDeduction: format((row as any).pensionDeduction),
          deductionTotal: format((row as any).deductionTotal),
          childcare: format((row as any).childcare),
          companyShare: format((row as any).companyShare)
        };
      } else {
        // ボーナス用: 標準賞与額・年度賞与合計の値をログ出力
        const bonusTotal = (row as any).bonusTotal;
        const standardBonus = (row as any).standardBonus;
        const annualBonusTotal = (row as any).annualBonusTotal;
        // console.log('bonus row:', { employeeName, bonusTotal, standardBonus, annualBonusTotal, row });
        return {
          officeName,
          employeeId: row.employeeId,
          employeeName,
          careInsurance,
          bonus: format(bonusTotal),
          grade: (row as any).healthGrade || 'ー',
          monthly: format((row as any).healthMonthly),
          standardBonus: format(standardBonus),
          annualBonusTotal: format(annualBonusTotal),
          healthInsurance: format((row as any).healthInsurance),
          healthInsuranceDeduction: format((row as any).healthInsuranceDeduction),
          careInsuranceMonthly: format((row as any).careInsuranceMonthly),
          careInsuranceDeduction: format((row as any).careInsuranceDeduction),
          pension: format((row as any).pension),
          pensionDeduction: format((row as any).pensionDeduction),
          deductionTotal: format((row as any).deductionTotal),
          childcare: format((row as any).childcare),
          companyShare: format((row as any).companyShare)
        };
      }
    });
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.updateResultList();
  }

  exportCsv() {
    // ヘッダー行の作成（共通部分）
    let headers = ['対象年月', '給与/賞与区分', '支社', '従業員ID', '従業員名', '介護保険適用'];
    
    // 給与/賞与に応じて異なるヘッダーを追加
    if (this.selectedType === 'salary') {
      headers = headers.concat([
        '当月給与総支給',
        '等級',
        '標準報酬月額',
        '健康保険料',
        '健康保険料控除額',
        '介護保険料',
        '介護保険料控除額',
        '厚生年金保険料',
        '厚生年金保険料控除額',
        '控除額合計',
        '子ども子育て拠出金',
        '会社負担'
      ]);
    } else {
      headers = headers.concat([
        '当月賞与',
        '標準賞与額',
        '年度賞与合計',
        '健康保険料',
        '健康保険料控除額',
        '介護保険料',
        '介護保険料控除額',
        '厚生年金保険料',
        '厚生年金保険料控除額',
        '控除額合計',
        '子ども子育て拠出金',
        '会社負担'
      ]);
    }

    // 対象年月の文字列を作成
    const yearMonthStr = this.selectedYear && this.selectedMonth
      ? `${this.selectedYear}年${this.selectedMonth}月`
      : this.selectedYear
        ? `${this.selectedYear}年全期間`
        : this.selectedMonth
          ? `全年${this.selectedMonth}月`
          : '全期間';

    // データ行の作成
    const rows = this.resultList.map(row => {
      const commonData = [
        yearMonthStr,
        this.selectedType === 'salary' ? '給与' : '賞与',
        row.officeName,
        row.employeeId,
        row.employeeName,
        row.careInsurance
      ];

      if (this.selectedType === 'salary') {
        return commonData.concat([
          row.salaryTotal,
          row.grade,
          row.monthly,
          row.healthInsurance,
          row.healthInsuranceDeduction,
          row.careInsuranceMonthly,
          row.careInsuranceDeduction,
          row.pension,
          row.pensionDeduction,
          row.deductionTotal,
          row.childcare,
          row.companyShare
        ]);
      } else {
        return commonData.concat([
          row.bonus,
          row.standardBonus,
          row.annualBonusTotal,
          row.healthInsurance,
          row.healthInsuranceDeduction,
          row.careInsuranceMonthly,
          row.careInsuranceDeduction,
          row.pension,
          row.pensionDeduction,
          row.deductionTotal,
          row.childcare,
          row.companyShare
        ]);
      }
    });

    // CSVデータの作成
    const csvContent = [headers].concat(rows)
      .map(row => row.map(cell => {
        // セルの値に「,」や「"」が含まれている場合は、「"」で囲み、「"」は「""」にエスケープする
        const cellStr = String(cell).replace(/"/g, '""');
        return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')
          ? `"${cellStr}"`
          : cellStr;
      }).join(','))
      .join('\n');

    // BOMを付与してUTF-8でエンコード
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
    
    // ダウンロードリンクを作成して自動クリック
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `社会保険料一覧_${yearMonthStr}_${this.selectedType === 'salary' ? '給与' : '賞与'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ngModelの双方向バインドでselectedTypeが変わったときに呼ばれる
  // (AngularのngModelChangeイベントを使う場合は明示的に呼び出し可)
}
