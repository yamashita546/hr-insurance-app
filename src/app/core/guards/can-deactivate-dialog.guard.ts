import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { StandardMonthlyComponent } from '../../features/master/pages/standard-monthly/standard-monthly.component';
import { CompaniesComponent } from '../../features/master/pages/companies/company.base.info/companies.component';

type DialogComponent = StandardMonthlyComponent | CompaniesComponent;

@Injectable({ providedIn: 'root' })
export class CanDeactivateDialogGuard implements CanDeactivate<DialogComponent> {
  canDeactivate(component: DialogComponent): boolean {
    if ((component as any).dialogRef) {
      const result = window.confirm('ダイアログが開いています。ページを離れますか？');
      if (result) {
        // キャンセル扱いでダイアログを閉じる
        (component as any).dialogRef.close();
        (component as any).dialogRef = null;
      }
      return result;
    }
    return true;
  }
}
