import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgChartsModule } from 'ng2-charts';

// Routing
import { PayrollOfficerRoutingModule } from './payroll-officer-routing.module';

// Components
import { PayrollOfficerDashboardComponent } from './components/dashboard/payroll-officer-dashboard.component';
import { PayrollOverviewComponent } from './components/overview/payroll-overview.component';
import { PayrollCyclesComponent } from './components/payroll-cycles/payroll-cycles.component';
import { EmployeePayrollComponent } from './components/employee-payroll/employee-payroll.component';
import { SalaryStructuresComponent } from './components/salary-structures/salary-structures.component';
import { PayslipsComponent } from './components/payslips/payslips.component';
import { PayrollReportsComponent } from './components/reports/payroll-reports.component';
import { PayrollFinalizationComponent } from './components/finalization/payroll-finalization.component';
import { AttendanceIntegrationComponent } from './components/attendance-integration/attendance-integration.component';
import { DeductionsManagementComponent } from './components/deductions-management/deductions-management.component';

// Dialogs
import { CreatePayrollCycleDialogComponent } from './dialogs/create-payroll-cycle-dialog/create-payroll-cycle-dialog.component';
import { ProcessPayrollDialogComponent } from './dialogs/process-payroll-dialog/process-payroll-dialog.component';
import { SalaryAdjustmentDialogComponent } from './dialogs/salary-adjustment-dialog/salary-adjustment-dialog.component';
import { DeductionDialogComponent } from './dialogs/deduction-dialog/deduction-dialog.component';
import { PayslipPreviewDialogComponent } from './dialogs/payslip-preview-dialog/payslip-preview-dialog.component';
import { FinalizePayrollDialogComponent } from './dialogs/finalize-payroll-dialog/finalize-payroll-dialog.component';
import { ReportExportDialogComponent } from './dialogs/report-export-dialog/report-export-dialog.component';

// Services
import { PayrollOfficerService } from './services/payroll-officer.service';
import { PayrollCycleService } from './services/payroll-cycle.service';
import { EmployeePayrollService } from './services/employee-payroll.service';
import { SalaryStructureService } from './services/salary-structure.service';
import { PayslipService } from './services/payslip.service';
import { PayrollReportService } from './services/payroll-report.service';
import { AttendanceIntegrationService } from './services/attendance-integration.service';
import { DeductionService } from './services/deduction.service';

@NgModule({
  declarations: [
    PayrollOfficerDashboardComponent,
    PayrollOverviewComponent,
    PayrollCyclesComponent,
    EmployeePayrollComponent,
    SalaryStructuresComponent,
    PayslipsComponent,
    PayrollReportsComponent,
    PayrollFinalizationComponent,
    AttendanceIntegrationComponent,
    DeductionsManagementComponent,
    CreatePayrollCycleDialogComponent,
    ProcessPayrollDialogComponent,
    SalaryAdjustmentDialogComponent,
    DeductionDialogComponent,
    PayslipPreviewDialogComponent,
    FinalizePayrollDialogComponent,
    ReportExportDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PayrollOfficerRoutingModule,
    NgChartsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatBadgeModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatSlideToggleModule
  ],
  providers: [
    PayrollOfficerService,
    PayrollCycleService,
    EmployeePayrollService,
    SalaryStructureService,
    PayslipService,
    PayrollReportService,
    AttendanceIntegrationService,
    DeductionService
  ]
})
export class PayrollOfficerModule { }