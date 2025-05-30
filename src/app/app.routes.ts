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
import { CompanySettingComponent } from './features/settings/pages/company-setting/company-setting.component';
import { NotificationComponent } from './features/notification/pages/notification.component';
import { DashboardComponent } from './features/dashboard/pages/dashboard/dashboard.component';
import { HelpComponent } from './features/help/pages/help/help.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { authGuard } from './core/guards/auth.guards';
import { CompaniesComponent } from './features/master/pages/companies/company.base.info/companies.component';
import { InsuranceRateComponent } from './features/master/pages/insurance-rate/insurance-rate.component';
import { ManageAdminComponent } from './features/master/pages/manage-admin/manage-admin.component';
import { StandardMonthlyComponent } from './features/master/pages/standard-monthly/standard-monthly.component';
import { ManageUserComponent } from './features/auth/pages/manage-user/manage-user.component';
import { RegisterComponent } from './features/auth/pages/register/register.component';
import { CanDeactivateDialogGuard } from './core/guards/can-deactivate-dialog.guard';
import { ManageCompaniesComponent } from './features/master/pages/companies/manage-companies/manage-companies.component';
import { CompanyOwnerComponent } from './features/master/pages/companies/company-owner/company-owner.component';
import { ManageOfficeComponent } from './features/settings/pages/manage-office/manage-office.component';
import { ManageOperatorComponent } from './features/settings/pages/manage-operator/manage-operator.component';
import { MyCompanyComponent } from './features/settings/pages/my-company/my-company.component';
import { EmployeeDetailComponent } from './features/employees/pages/employee-detail/employee-detail.component';
import { EmployeeFormComponent } from './features/employees/components/employee-form/employee-form.component';
import { AttendanceFormComponent } from './features/attendance/components/attendance-form/attendance-form.component';
import { SalaryRegistrationComponent } from './features/salary-data/pages/salary-registration/salary-registration.component';
import { ManageStandardMonthlyComponent } from './features/salary-data/pages/manage-standard-monthly/manage-standard-monthly.component';
import { SalaryFormComponent } from './features/salary-data/components/salary-form/salary-form.component';
import { StandardMonthlyFormComponent } from './features/salary-data/components/standard-monthly-form/standard-monthly-form.component';
import { InsuranceFormComponent } from './features/insurance/components/insurance-form/insurance-form.component';


export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: HomeComponent },
      { path: 'insurance-calc', component: InsuranceListComponent },
      { path: 'employee', component: EmployeeListComponent },
      { path: 'payroll', component: SalaryListComponent },
      { path: 'attendance', component: AttendanceListComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'csv-export', component: CsvExportComponent },
      { path: 'history', component: HistoryListComponent },
      { path: 'master', component: MasterMainComponent },
      { path: 'settings', component: CompanySettingComponent },
      { path: 'notification', component: NotificationComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'help', component: HelpComponent },
      { path: 'manage-company', component: ManageCompaniesComponent},
      { path: 'company-info', component: CompaniesComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'company-owner', component: CompanyOwnerComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'insurance-rate', component: InsuranceRateComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'manage-admin', component: ManageAdminComponent },
      { path: 'standard-monthly', component: StandardMonthlyComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'manage-user', component: ManageUserComponent },
      { path: 'manage-office', component: ManageOfficeComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'manage-operator', component: ManageOperatorComponent },
      { path: 'my-company', component: MyCompanyComponent },
      { path: 'employee-detail', component: EmployeeDetailComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'employee-form', component: EmployeeFormComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'employee-detail/:id', component: EmployeeDetailComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'attendance-form', component: AttendanceFormComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'salary-registration', component: SalaryRegistrationComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'manage-standard-monthly', component: ManageStandardMonthlyComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'salary-form', component: SalaryFormComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'standard-monthly-form', component: StandardMonthlyFormComponent, canDeactivate: [CanDeactivateDialogGuard] },
      { path: 'insurance-form', component: InsuranceFormComponent, canDeactivate: [CanDeactivateDialogGuard] },
    ],
  },
];
