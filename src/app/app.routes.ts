import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { HomeComponent } from './features/home/pages/home/home.component';
import { InsuranceListComponent } from './features/insurance/pages/insurance-list/insurance-list.component';
import { EmployeeListComponent } from './features/employees/pages/employee-list/employee-list.component';
import { SalaryListComponent } from './features/salary-data/pages/salary-list/salary-list.component';
import { AttendanceListComponent } from './features/attendance/pages/attendance-list/attendance-list.component';
import { CsvExportComponent } from './features/export-import/pages/csv-export/csv-export.component';
import { HistoryListComponent } from './features/history/pages/history-list/history-list.component';
import { MasterListComponent } from './features/master/pages/master-list/master-list.component';
import { RateListComponent } from './features/settings/pages/rate-list/rate-list.component';
import { NotificationComponent } from './features/notification/pages/notification.component';
import { DashboardComponent } from './features/dashboard/pages/dashboard/dashboard.component';
import { HelpComponent } from './features/help/pages/help/help.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'insurance-calc', component: InsuranceListComponent },
      { path: 'employee', component: EmployeeListComponent },
      { path: 'payroll', component: SalaryListComponent },
      { path: 'attendance', component: AttendanceListComponent },
      { path: 'csv-export', component: CsvExportComponent },
      { path: 'history', component: HistoryListComponent },
      { path: 'master', component: MasterListComponent },
      { path: 'settings', component: RateListComponent },
      { path: 'notification', component: NotificationComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'help', component: HelpComponent },
    ],
    // canActivate: [AuthGuard],
  },
];
