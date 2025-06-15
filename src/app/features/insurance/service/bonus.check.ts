import { isMaternityLeaveExempted, isChildcareLeaveExempted } from './check.service';
import { ChildcareInsuranceRate } from '../../../core/models/insurance-rate.model';

// 賞与計算プレビューリスト生成
export function generateBonusPreviewList({
  employees,
  bonuses,
  standardMonthlyDecisions,
  offices,
  insuranceRates,
  selectedYear,
  selectedMonth,
  excludeNoBonusEmployees,
  getStandardMonthlyForEmployee,
  getInsuranceRateForOffice,
  getAgeAtYearMonth1st,
  isAgeArrivalInMonth,
  getAppliedExemptions,
  formatDecimal,
  roundSocialInsurance
}: any) {
  const ymStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  // 全従業員・該当月の全賞与を1件ごとに出力
  let previewList: any[] = [];
  for (const emp of employees) {
    // 対象月の賞与をすべて抽出
    const empBonuses = bonuses.filter((b: any) => b.employeeId === emp.employeeId && b.targetYearMonth === ymStr);
    if (empBonuses.length === 0) {
      // 賞与なしでも1行出す場合はここでpush
      if (!excludeNoBonusEmployees) {
        previewList.push({
          officeId: emp.officeId,
          employeeId: emp.employeeId,
          officeName: offices.find((o: any) => o.id === emp.officeId)?.name || '',
          employeeName: emp.lastName + ' ' + emp.firstName,
          careInsurance: '×',
          bonus: 'ー',
          bonusDate: '',
          grade: 'ー',
          monthly: 'ー',
          standardBonus: null,
          annualBonusTotal: 'ー',
          healthInsurance: 'ー',
          healthInsuranceDeduction: 'ー',
          pension: 'ー',
          pensionDeduction: 'ー',
          deductionTotal: 'ー',
          childcare: 'ー',
          companyShare: 'ー',
          appliedExemptions: [],
        });
      }
      continue;
    }
    // 支給日・登録日時で昇順ソート
    const sortedBonuses = empBonuses.slice().sort((a: any, b: any) => {
      // 支給日昇順、同一支給日はcreatedAt（なければid）昇順
      const dateCmp = (a.paymentDate || '').localeCompare(b.paymentDate || '');
      if (dateCmp !== 0) return dateCmp;
      // createdAtがあればそれで比較、なければid
      if (a.createdAt && b.createdAt) {
        const aTime = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt.seconds ? a.createdAt.seconds * 1000 : 0);
        const bTime = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt.seconds ? b.createdAt.seconds * 1000 : 0);
        return aTime - bTime;
      }
      if (a.id && b.id) return (a.id > b.id ? 1 : -1);
      return 0;
    });
    for (let idx = 0; idx < sortedBonuses.length; idx++) {
      const bonus = sortedBonuses[idx];
      // 産前産後休業・育児休業の免除判定
      const isMaternityExempted = isMaternityLeaveExempted(emp, ymStr);
      const isChildcareExempted = isChildcareLeaveExempted(emp, ymStr);
      const std = getStandardMonthlyForEmployee(emp.employeeId, emp.officeId);
      const rate = getInsuranceRateForOffice(emp.officeId);
      // 各保険の適用判定
      let healthApplicable = emp.healthInsuranceStatus?.isApplicable;
      const ageArrival = isAgeArrivalInMonth(emp, selectedYear, selectedMonth);
      // 75歳到達月は健康保険対象外
      if (ageArrival[75]) {
        healthApplicable = false;
      }
      let careInsurance = '×';
      let isCare = false;
      if (emp.birthday) {
        const age = getAgeAtYearMonth1st(emp.birthday, selectedYear, selectedMonth);
        // 介護保険の適用判定: 40歳到達月から65歳到達月の前月まで
        if (emp.isCareInsuranceApplicable) {
          const isAfter40 = age > 40 || (age === 40) || ageArrival[40];
          const isBefore65 = age < 65 || (age === 65 && !ageArrival[65]);
          isCare = isAfter40 && isBefore65;
        }
        careInsurance = isCare ? '〇' : '×';
      }
      let bonusAmount = bonus ? Number(bonus.bonus) : null;
      let bonusDisplay = bonusAmount !== null ? bonusAmount.toLocaleString() : 'ー';
      // 標準賞与額（1000円未満切り捨て）
      let standardBonus: number | null = bonusAmount !== null ? Math.floor(bonusAmount / 1000) * 1000 : null;
      let standardBonusDisplay = standardBonus !== null ? standardBonus.toLocaleString() : 'ー';
      // 年度賞与合計（4月1日～支給日・登録順の自分までの合計）
      let annualBonusTotalBefore = 0;
      let annualBonusTotal = 0;
      let annualBonusTotalDisplay = 'ー';
      let annualBonusTotalBeforeDisplay = 'ー';
      if (emp.birthday && bonus.paymentDate) {
        const year = selectedYear;
        const fiscalYearStart = `${year}-04-01`;
        const paymentDate = bonus.paymentDate;
        if (paymentDate >= fiscalYearStart) {
          // その従業員の、年度開始日～この支給日までの全賞与（支給日・登録順で自分まで）
          // 支給日が同じ場合はcreatedAt（なければid）で自分まで
          const bonusesInYear = bonuses
            .filter((b: any) =>
              b.employeeId === emp.employeeId &&
              b.paymentDate &&
              b.paymentDate >= fiscalYearStart &&
              b.paymentDate < paymentDate
            );
          // 同じ支給日の中で自分より前のものも加算
          const sameDateBonuses = bonuses
            .filter((b: any) =>
              b.employeeId === emp.employeeId &&
              b.paymentDate === paymentDate
            )
            .sort((a: any, b: any) => {
              if (a.createdAt && b.createdAt) {
                const aTime = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt.seconds ? a.createdAt.seconds * 1000 : 0);
                const bTime = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt.seconds ? b.createdAt.seconds * 1000 : 0);
                return aTime - bTime;
              }
              if (a.id && b.id) return (a.id > b.id ? 1 : -1);
              return 0;
            });
          const myIndex = sameDateBonuses.findIndex((b: any) => b === bonus);
          // 直前までの合計
          const bonusesToSumBefore = [
            ...bonusesInYear,
            ...sameDateBonuses.slice(0, myIndex)
          ];
          annualBonusTotalBefore = bonusesToSumBefore.reduce((acc: number, b: any) => acc + Math.floor(Number(b.bonus) / 1000) * 1000, 0);
          annualBonusTotal = annualBonusTotalBefore + Math.floor(Number(bonus.bonus) / 1000) * 1000;
          annualBonusTotalBeforeDisplay = annualBonusTotalBefore ? annualBonusTotalBefore.toLocaleString() : 'ー';
          annualBonusTotalDisplay = annualBonusTotal ? annualBonusTotal.toLocaleString() : 'ー';
        }
      }
      // 休業特例による免除（健康保険・厚生年金）
      let healthExempted = isMaternityExempted || isChildcareExempted;
      // 健康保険料計算
      let healthInsurance = 'ー';
      let pension = 'ー';
      let childcare = 'ー';
      let healthInsuranceDeduction = 'ー';
      let pensionDeduction = 'ー';
      let deductionTotal = 'ー';
      let companyShare = 'ー';
      if (standardBonus !== null && rate) {
        // 健康保険料：573万円上限
        const limit = 5730000;
        let targetBonus = 0;
        if (annualBonusTotal <= limit) {
          targetBonus = standardBonus;
        } else if (annualBonusTotalBefore < limit) {
          targetBonus = limit - annualBonusTotalBefore;
          if (targetBonus < 0) targetBonus = 0;
        } else {
          targetBonus = 0;
        }
        // 料率
        let healthRate = rate.healthInsuranceRate;
        let careRate = isCare && rate.careInsuranceRate ? rate.careInsuranceRate : 0;
        let totalHealthRate = healthRate + careRate;
        // 健康保険料
        const health = targetBonus * (totalHealthRate / 100);
        healthInsurance = formatDecimal(health);
        // 厚生年金保険料（標準賞与額は150万円上限）
        const pensionTarget = Math.min(standardBonus ?? 0, 1500000);
        const pensionVal = pensionTarget * (rate.employeePensionInsuranceRate / 100);
        pension = formatDecimal(pensionVal);
        // 子ども子育て拠出金（標準賞与額は150万円上限）
        const childcareRate = Number(ChildcareInsuranceRate.CHILDCARE_INSURANCE_RATE);
        const childcareVal = pensionTarget * (childcareRate / 100);
        childcare = formatDecimal(childcareVal);
        // 健康保険料控除額
        const healthDeduct = roundSocialInsurance(health / 2);
        healthInsuranceDeduction = healthDeduct.toLocaleString();
        // 厚生年金保険料控除額
        const pensionDeduct = roundSocialInsurance(pensionVal / 2);
        pensionDeduction = pensionDeduct.toLocaleString();
        // 控除額合計
        const deductionSum = healthDeduct + pensionDeduct;
        deductionTotal = deductionSum.toLocaleString();
        // 会社負担
        const companyShareVal = deductionSum + childcareVal;
        companyShare = formatDecimal(companyShareVal);
      }
      // ここで免除特例を取得
      const appliedExemptions = getAppliedExemptions(emp, selectedYear, selectedMonth);
      previewList.push({
        officeId: emp.officeId,
        employeeId: emp.employeeId,
        officeName: offices.find((o: any) => o.id === emp.officeId)?.name || '',
        employeeName: emp.lastName + ' ' + emp.firstName,
        careInsurance,
        bonus: bonusDisplay,
        bonusDate: bonus.paymentDate || '',
        grade: std ? `${std.healthGrade}（${std.pensionGrade}）` : 'ー',
        monthly: std ? Number(std.healthMonthly).toLocaleString() : 'ー',
        standardBonus,
        annualBonusTotal,
        annualBonusTotalBefore,
        annualBonusTotalDisplay,
        annualBonusTotalBeforeDisplay,
        healthInsurance,
        healthInsuranceDeduction,
        pension,
        pensionDeduction,
        deductionTotal,
        childcare,
        companyShare,
        // 追加項目
        prefectureName: '',
        healthRate: 0,
        careRate: 0,
        pensionRate: 0,
        childcareRate: 0,
        insuranceTotal: 0,
        appliedExemptions,
      });
    }
  }
  // チェックボックスがONならボーナス支給のない従業員を除外
  if (excludeNoBonusEmployees) {
    return previewList.filter((row: any) => {
      if (row.bonus === undefined || row.bonus === null || row.bonus === '' || row.bonus === 'ー') return false;
      const bonusNum = typeof row.bonus === 'string' ? Number(row.bonus.toString().replace(/,/g, '')) : row.bonus;
      return bonusNum > 0;
    });
  }
  return previewList;
}
