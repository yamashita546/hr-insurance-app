import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { StandardMonthlyComponent } from '../../features/master/pages/standard-monthly/standard-monthly.component';
import { CompaniesComponent } from '../../features/master/pages/companies/company.base.info/companies.component';
import { EmployeeFormComponent } from '../../features/employees/components/employee-form/employee-form.component';
import { EmployeeDetailComponent } from '../../features/employees/pages/employee-detail/employee-detail.component';

// 型を拡張
// eslint-disable-next-line @typescript-eslint/no-type-alias
type DialogComponent = StandardMonthlyComponent | CompaniesComponent | EmployeeFormComponent | EmployeeDetailComponent;

@Injectable({ providedIn: 'root' })
export class CanDeactivateDialogGuard implements CanDeactivate<DialogComponent> {
  canDeactivate(component: DialogComponent): boolean {
    // dialogRefがある場合
    if ((component as any).dialogRef) {
      const result = window.confirm('ダイアログが開いています。ページを離れますか？');
      if (result) {
        (component as any).dialogRef.close();
        (component as any).dialogRef = null;
      }
      return result;
    }
    // EmployeeFormComponent/EmployeeDetailComponentのcanDeactivate
    if (typeof (component as any).canDeactivate === 'function') {
      const result = (component as any).canDeactivate();
      // EmployeeFormComponentの場合、遷移OKならローカルストレージ削除
      if (
        result &&
        component.constructor.name === 'EmployeeFormComponent'
      ) {
        localStorage.removeItem('employeeFormData');
        localStorage.removeItem('employeeFormTabIndex');
      }
      return result;
    }
    return true;
  }
}
