import { isMaternityLeaveExempted, isChildcareLeaveExempted, checkInsuranceExemption } from './check.service';
import { ChildcareInsuranceRate } from '../../../core/models/insurance-rate.model';
import { getAllAgeArrivalDates } from '../../../core/services/age.determination';
import { PREFECTURES } from '../../../core/models/prefecture.model';

// 賞与計算プレビューリスト生成
export function generateBonusPreviewList({
  employees,
  bonuses,
  allBonuses,
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
  roundSocialInsurance,
  isCareInsuranceApplicableForDisplay
}: any) {
  const ymStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  // 全従業員・該当月の全賞与を1件ごとに出力
  let previewList: any[] = [];
  for (const emp of employees) {
    // 従業員ごとに合算済みの賞与を1件見つける
    const bonus = bonuses.find((b: any) => b.employeeId === emp.employeeId);

    // 賞与がない、またはボーナス額が0の場合
    if (!bonus || !bonus.bonus) {
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
          bonusDiff: 0,
          pensionMax: 'ー',
          remarks: '',
          standardBonusValue: null,
          annualBonusTotalValue: 'ー',
          annualBonusTotalBeforeValue: 'ー',
        });
      }
      continue;
    }

    // 産前産後休業・育児休業の免除判定
    const isMaternityExempted = isMaternityLeaveExempted(emp, ymStr);
    const isChildcareExempted = isChildcareLeaveExempted(emp, ymStr);
    const std = getStandardMonthlyForEmployee(emp.employeeId, emp.officeId);
    const rate = getInsuranceRateForOffice(emp.officeId);
    // 各保険の適用判定
    let healthApplicable = emp.healthInsuranceStatus?.isApplicable;
    let pensionApplicable = true;
    const ageArrival = isAgeArrivalInMonth(emp, selectedYear, selectedMonth);
    // 外国人特例（国籍ごとに判定）
    const specialExemption = getSpecialExemptionType(emp);
    if (specialExemption === 'pension') {
      pensionApplicable = false;
    } else if (specialExemption === 'both') {
      pensionApplicable = false;
      healthApplicable = false;
    }
    // 75歳到達月は健康保険対象外
    if (isAgeArrivedOrAfter(emp, selectedYear, selectedMonth, 75)) {
      healthApplicable = false;
    }
    // 70歳到達月は厚生年金対象外
    if (isAgeArrivedOrAfter(emp, selectedYear, selectedMonth, 70)) {
      pensionApplicable = false;
    }
    // 介護保険の適用判定（給与と同じロジック）
    let careInsurance = '×';
    let isCare = false;
    const careInsuranceFlag = isCareInsuranceApplicableForDisplay(
      emp, std, rate, selectedYear, selectedMonth, healthApplicable, ymStr, true
    );
    // console.log('【介護保険判定】', {
    //   employeeId: emp.employeeId,
    //   name: emp.lastName + emp.firstName,
    //   age: getAgeAtYearMonth1st(emp.birthday, selectedYear, selectedMonth),
    //   healthApplicable,
    //   std,
    //   rate,
    //   careInsuranceApplicable: careInsuranceFlag,
    //   careInsuranceRate: rate?.careInsuranceRate,
    //   healthInsuranceStatus: emp.healthInsuranceStatus,
    //   appliedExemptions: getAppliedExemptions(emp, selectedYear, selectedMonth)
    // });
    careInsurance = careInsuranceFlag ? '〇' : '×';
    isCare = careInsuranceFlag;
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
        const bonusesInYear = allBonuses
          .filter((b: any) =>
            b.employeeId === emp.employeeId &&
            b.paymentDate &&
            b.paymentDate >= fiscalYearStart &&
            b.paymentDate < paymentDate
          );
        // 同じ支給日の中で自分より前のものも加算
        const sameDateBonuses = allBonuses
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
        const myIndex = sameDateBonuses.findIndex((b: any) => b.id === bonus.id); // 合算後のIDで比較
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
    // 573万円上限に関する差額（今回の賞与で保険料算出対象となった金額）
    let bonusDiff = 0;
    if (standardBonus !== null && rate) {
      const limit = 5730000;
      if (annualBonusTotal <= limit) {
        bonusDiff = standardBonus;
      } else if (annualBonusTotalBefore < limit) {
        bonusDiff = limit - annualBonusTotalBefore;
        if (bonusDiff < 0) bonusDiff = 0;
      } else {
        bonusDiff = 0;
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
    let insuranceTotal = 0;
    let pensionMonthly = std && std.pensionMonthly !== undefined && std.pensionMonthly !== null
      ? Number(std.pensionMonthly)
      : (std ? Number(std.healthMonthly) : null);
    let grade = std ? `${std.healthGrade}（${std.pensionGrade}）` : 'ー';
    let monthly = std ? Number(std.healthMonthly).toLocaleString() : 'ー';
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
      // 会社負担（保険料総額－控除額合計＋子ども子育て拠出金）
      const companyShareVal = (health + pensionVal) - deductionSum + childcareVal;
      companyShare = formatDecimal(companyShareVal);
      // 保険料総額
      insuranceTotal = health + pensionVal;
    }
    // 年齢による資格喪失を金額に反映
    if (!healthApplicable) {
      healthInsurance = '0';
      healthInsuranceDeduction = '0';
    }
    if (!pensionApplicable) {
      pension = '0';
      pensionDeduction = '0';
      childcare = '0'; // 70歳厚生年金免除時も拠出金免除
    }
    if (!healthApplicable && !pensionApplicable) {
      deductionTotal = '0';
      companyShare = '0';
      childcare = '0';
    }
    // ここで免除特例を取得
    const appliedExemptions = getAppliedExemptions(emp, selectedYear, selectedMonth);
    // 退職日・入社日による社会保険免除判定
    const exemptionResult = checkInsuranceExemption(emp, ymStr);
    if (exemptionResult.exemption) {
      // 免除の場合は各保険料を0円に
      careInsurance = '×';
      healthInsurance = '0';
      healthInsuranceDeduction = '0';
      pension = '0';
      pensionDeduction = '0';
      deductionTotal = '0';
      childcare = '0';
      companyShare = '0';
      appliedExemptions.push(exemptionResult.exemptionType || '');
    } else if (exemptionResult.exemptionType === '同月得喪') {
      appliedExemptions.push('同月得喪');
    }
    // 保険料率・都道府県名のセット
    let healthRate = 0;
    let careRate = 0;
    let pensionRate = 0;
    let childcareRate = 0;
    let prefectureName = '';
    if (rate) {
      healthRate = rate.healthInsuranceRate || 0;
      careRate = rate.careInsuranceRate || 0;
      pensionRate = rate.employeePensionInsuranceRate || 0;
      childcareRate = Number(ChildcareInsuranceRate.CHILDCARE_INSURANCE_RATE);
    }
    const office = offices.find((o: any) => o.id === emp.officeId);
    if (office && office.insurancePrefecture) {
      const pref = (typeof PREFECTURES !== 'undefined' ? PREFECTURES : []).find((p: any) => p.code === office.insurancePrefecture);
      prefectureName = pref ? pref.name : '';
    }
    // pensionMax（厚生年金上限）を計算
    let pensionMax = 'ー';
    if (standardBonus !== null && standardBonus > 1500000) {
      pensionMax = '1,500,000';
    }
    // 免除特例を反映
    appliedExemptions.forEach((ex: string) => {
      // 何か特例適用時の処理があれば
    });
    
    previewList.push({
      officeId: emp.officeId,
      employeeId: emp.employeeId,
      officeName: offices.find((o: any) => o.id === emp.officeId)?.name || '',
      employeeName: emp.lastName + ' ' + emp.firstName,
      careInsurance,
      bonus: bonusDisplay,
      bonusDate: bonus.paymentDate,
      grade,
      monthly,
      pensionMonthly,
      standardBonus: standardBonusDisplay,
      annualBonusTotal: annualBonusTotalDisplay,
      annualBonusTotalBefore: annualBonusTotalBeforeDisplay,
      healthInsurance,
      healthInsuranceDeduction,
      pension,
      pensionDeduction,
      deductionTotal,
      childcare,
      companyShare,
      prefectureName,
      healthRate: rate.healthInsuranceRate,
      pensionRate: rate.employeePensionInsuranceRate,
      careRate: isCare && rate.careInsuranceRate ? rate.careInsuranceRate : 0,
      childcareRate: Number(ChildcareInsuranceRate.CHILDCARE_INSURANCE_RATE),
      insuranceTotal,
      appliedExemptions,
      bonusDiff,
      pensionMax,
      remarks: bonus.remarks || '',
      standardBonusValue: standardBonus,
      annualBonusTotalValue: annualBonusTotal,
      annualBonusTotalBeforeValue: annualBonusTotalBefore,
    });
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

function isAgeArrivedOrAfter(emp: any, year: number, month: number, targetAge: number): boolean {
  if (!emp.birthday) return false;
  const arrivalDates = getAllAgeArrivalDates(emp.birthday);
  const arrival = arrivalDates[targetAge];
  if (!arrival) return false;
  const targetDate = new Date(year, month - 1, 1);
  return targetDate >= arrival;
}

// 国籍ごとの免除判定関数を追加
function getSpecialExemptionType(emp: any): 'pension' | 'both' | null {
  if (!emp.isForeignWorker || !emp.foreignWorker?.hasSpecialExemption) return null;
  const code = emp.foreignWorker?.nationality;
  if (!code) return null;
  // 厚生年金のみ免除
  const pensionOnly = ['DE', 'KR', 'AU', 'BR', 'IN', 'CN', 'PH', 'SK', 'IE', 'IT'];
  // 厚生年金＋健康保険免除
  const both = ['US', 'BE', 'FR', 'NL', 'CZ', 'CH', 'HU', 'LU', 'SE', 'FI'];
  if (pensionOnly.includes(code)) return 'pension';
  if (both.includes(code)) return 'both';
  return null;
}
