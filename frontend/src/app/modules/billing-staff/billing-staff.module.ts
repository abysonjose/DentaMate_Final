import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';

import { BillingStaffRoutingModule } from './billing-staff-routing.module';

// Components
import { BillingDashboardComponent } from './components/dashboard/billing-dashboard.component';
import { BillGenerationComponent } from './components/bill-generation/bill-generation.component';
import { InvoiceManagementComponent } from './components/invoice-management/invoice-management.component';
import { PaymentProcessingComponent } from './components/payment-processing/payment-processing.component';
import { PaymentStatusTrackingComponent } from './components/payment-status-tracking/payment-status-tracking.component';
import { PatientBillingHistoryComponent } from './components/patient-billing-history/patient-billing-history.component';
import { PharmacyCoordinationComponent } from './components/pharmacy-coordination/pharmacy-coordination.component';
import { BillingReportsComponent } from './components/billing-reports/billing-reports.component';

// Dialogs
import { GenerateBillDialogComponent } from './dialogs/generate-bill-dialog/generate-bill-dialog.component';
import { PaymentDialogComponent } from './dialogs/payment-dialog/payment-dialog.component';
import { InvoiceDetailsDialogComponent } from './dialogs/invoice-details-dialog/invoice-details-dialog.component';
import { BillingCorrectionDialogComponent } from './dialogs/billing-correction-dialog/billing-correction-dialog.component';

// Services
import { BillingStaffService } from './services/billing-staff.service';
import { BillGenerationService } from './services/bill-generation.service';
import { PaymentProcessingService } from './services/payment-processing.service';
import { InvoiceService } from './services/invoice.service';
import { BillingReportsService } from './services/billing-reports.service';

@NgModule({
  declarations: [
    BillingDashboardComponent,
    BillGenerationComponent,
    InvoiceManagementComponent,
    PaymentProcessingComponent,
    PaymentStatusTrackingComponent,
    PatientBillingHistoryComponent,
    PharmacyCoordinationComponent,
    BillingReportsComponent,
    GenerateBillDialogComponent,
    PaymentDialogComponent,
    InvoiceDetailsDialogComponent,
    BillingCorrectionDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    BillingStaffRoutingModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatSnackBarModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatBadgeModule
  ],
  providers: [
    BillingStaffService,
    BillGenerationService,
    PaymentProcessingService,
    InvoiceService,
    BillingReportsService
  ]
})
export class BillingStaffModule { }