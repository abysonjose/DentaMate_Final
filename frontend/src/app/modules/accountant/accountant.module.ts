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

import { AccountantRoutingModule } from './accountant-routing.module';
import { AccountantDashboardComponent } from './components/dashboard/accountant-dashboard.component';
import { BillingRecordsComponent } from './components/billing-records/billing-records.component';
import { PaymentVerificationComponent } from './components/payment-verification/payment-verification.component';
import { LedgerManagementComponent } from './components/ledger-management/ledger-management.component';
import { ReceivablesTrackingComponent } from './components/receivables-tracking/receivables-tracking.component';
import { ReportsComponent } from './components/reports/reports.component';
import { AuditSupportComponent } from './components/audit-support/audit-support.component';
import { TaxPreparationComponent } from './components/tax-preparation/tax-preparation.component';
import { CashierCoordinationComponent } from './components/cashier-coordination/cashier-coordination.component';
import { BillingCoordinationComponent } from './components/billing-coordination/billing-coordination.component';

// Dialogs
import { ReconciliationDialogComponent } from './dialogs/reconciliation-dialog/reconciliation-dialog.component';
import { LedgerTagDialogComponent } from './dialogs/ledger-tag-dialog/ledger-tag-dialog.component';
import { AuditNoteDialogComponent } from './dialogs/audit-note-dialog/audit-note-dialog.component';
import { ReportExportDialogComponent } from './dialogs/report-export-dialog/report-export-dialog.component';

@NgModule({
  declarations: [
    AccountantDashboardComponent,
    BillingRecordsComponent,
    PaymentVerificationComponent,
    LedgerManagementComponent,
    ReceivablesTrackingComponent,
    ReportsComponent,
    AuditSupportComponent,
    TaxPreparationComponent,
    CashierCoordinationComponent,
    BillingCoordinationComponent,
    ReconciliationDialogComponent,
    LedgerTagDialogComponent,
    AuditNoteDialogComponent,
    ReportExportDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AccountantRoutingModule,
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
    MatMenuModule
  ]
})
export class AccountantModule { }