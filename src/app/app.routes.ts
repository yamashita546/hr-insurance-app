import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { HomeComponent } from './features/home/pages/home/home.component';
import { InsuranceListComponent } from './features/insurance/pages/insurance-list/insurance-list.component';
import { EmployeeListComponent } from './features/employees/pages/employee-list/employee-list.component';
import { SalaryListComponent } from './features/salary-data/pages/salary-list/salary-list.component';
import { AttendanceListComponent } from './features/attendance/pages/attendance-list/attendance-list.component';
import { CsvExportComponent } from './features/export-import/pages/csv-export/csv-export.component';
import { HistoryListComponent } from './features/history/pages/history-list/history-list.component';
import { MasterMainComponent } from './features/master/pages/master-main/master-main.component';
import { RateListComponent } from './features/settings/pages/rate-list/rate-list.component';
import { NotificationComponent } from './features/notification/pages/notification.component';
import { DashboardComponent } from './features/dashboard/pages/dashboard/dashboard.component';
import { HelpComponent } from './features/help/pages/help/help.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { authGuard } from './core/guards/auth.guards';
import { CompaniesComponent } from './features/master/pages/companies/companies.component';




export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: HomeComponent },
      { path: 'insurance-calc', component: InsuranceListComponent },
      { path: 'employee', component: EmployeeListComponent },
      { path: 'payroll', component: SalaryListComponent },
      { path: 'attendance', component: AttendanceListComponent },
      { path: 'csv-export', component: CsvExportComponent },
      { path: 'history', component: HistoryListComponent },
      { path: 'master', component: MasterMainComponent },
      { path: 'settings', component: RateListComponent },
      { path: 'notification', component: NotificationComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'help', component: HelpComponent },
      { path: 'company-info', component: CompaniesComponent },
    ],
  },
];
