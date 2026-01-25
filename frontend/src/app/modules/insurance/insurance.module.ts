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
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatStepperModule } from '@angular/material/stepper';

import { InsuranceRoutingModule } from './insurance-routing.module';
import { InsuranceDashboardComponent } from './components/dashboard/insurance-dashboard.component';
import { ClaimsOverviewComponent } from './components/claims-overview/claims-overview.component';
import { PatientInsuranceComponent } from './components/patient-insurance/patient-insurance.component';
import { ClaimSubmissionComponent } from './components/claim-submission/claim-submission.component';
import { ClaimTrackingComponent } from './components/claim-tracking/claim-tracking.component';
import { DocumentManagementComponent } from './components/document-management/document-management.component';
import { InsurerCommunicationComponent } from './components/insurer-communication/insurer-communication.component';
import { SettlementVerificationComponent } from './components/settlement-verification/settlement-verification.component';
import { ReportsAnalyticsComponent } from './components/reports-analytics/reports-analytics.component';

// Dialogs
import { CreateClaimDialogComponent } from './dialogs/create-claim-dialog/create-claim-dialog.component';
import { DocumentUploadDialogComponent } from './dialogs/document-upload-dialog/document-upload-dialog.component';
import { CommunicationLogDialogComponent } from './dialogs/communication-log-dialog/communication-log-dialog.component';
import { ClaimDetailsDialogComponent } from './dialogs/claim-details-dialog/claim-details-dialog.component';

@NgModule({
  declarations: [
    InsuranceDashboardComponent,
    ClaimsOverviewComponent,
    PatientInsuranceComponent,
    ClaimSubmissionComponent,
    ClaimTrackingComponent,
    DocumentManagementComponent,
    InsurerCommunicationComponent,
    SettlementVerificationComponent,
    ReportsAnalyticsComponent,
    CreateClaimDialogComponent,
    DocumentUploadDialogComponent,
    CommunicationLogDialogComponent,
    ClaimDetailsDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InsuranceRoutingModule,
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
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule,
    MatExpansionModule,
    MatBadgeModule,
    MatTooltipModule,
    MatMenuModule,
    MatStepperModule
  ]
})
export class InsuranceModule { }