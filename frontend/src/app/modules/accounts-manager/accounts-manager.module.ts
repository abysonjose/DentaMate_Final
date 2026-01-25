import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AccountsManagerRoutingModule } from './accounts-manager-routing.module';

// Components
import { AccountsManagerDashboardComponent } from './components/dashboard/accounts-manager-dashboard.component';
import { FinancialOverviewComponent } from './components/financial-overview/financial-overview.component';
import { RevenueMonitoringComponent } from './components/revenue-monitoring/revenue-monitoring.component';
import { BillingOversightComponent } from './components/billing-oversight/billing-oversight.component';
import { RefundManagementComponent } from './components/refund-management/refund-management.component';
import { ReceivablesControlComponent } from './components/receivables-control/receivables-control.component';
import { ExpenseOversightComponent } from './components/expense-oversight/expense-oversight.component';
import { AccountantSupervisionComponent } from './components/accountant-supervision/accountant-supervision.component';
import { FinancialReportsComponent } from './components/financial-reports/financial-reports.component';
import { AuditComplianceComponent } from './components/audit-compliance/audit-compliance.component';
import { PolicyConfigurationComponent } from './components/policy-configuration/policy-configuration.component';

// Dialogs
import { ApprovalDialogComponent } from './dialogs/approval-dialog/approval-dialog.component';
import { RefundApprovalDialogComponent } from './dialogs/refund-approval-dialog/refund-approval-dialog.component';
import { AdjustmentDialogComponent } from './dialogs/adjustment-dialog/adjustment-dialog.component';
import { PolicyConfigDialogComponent } from './dialogs/policy-config-dialog/policy-config-dialog.component';
import { ReportExportDialogComponent } from './dialogs/report-export-dialog/report-export-dialog.component';

@NgModule({
  declarations: [
    AccountsManagerDashboardComponent,
    FinancialOverviewComponent,
    RevenueMonitoringComponent,
    BillingOversightComponent,
    RefundManagementComponent,
    ReceivablesControlComponent,
    ExpenseOversightComponent,
    AccountantSupervisionComponent,
    FinancialReportsComponent,
    AuditComplianceComponent,
    PolicyConfigurationComponent,
    ApprovalDialogComponent,
    RefundApprovalDialogComponent,
    AdjustmentDialogComponent,
    PolicyConfigDialogComponent,
    ReportExportDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AccountsManagerRoutingModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatBadgeModule,
    MatTabsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatProgressBarModule
  ]
})
export class AccountsManagerModule { }