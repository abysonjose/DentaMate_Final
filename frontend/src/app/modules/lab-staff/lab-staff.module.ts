import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LabStaffRoutingModule } from './lab-staff-routing.module';

// Components
import { LabStaffDashboardComponent } from './components/dashboard/lab-staff-dashboard.component';
import { DiagnosticRequestsComponent } from './components/diagnostic-requests/diagnostic-requests.component';
import { ReportUploadComponent } from './components/report-upload/report-upload.component';
import { PatientVerificationComponent } from './components/patient-verification/patient-verification.component';
import { DiagnosticHistoryComponent } from './components/diagnostic-history/diagnostic-history.component';
import { WorklistOverviewComponent } from './components/worklist-overview/worklist-overview.component';
import { AiProcessingStatusComponent } from './components/ai-processing-status/ai-processing-status.component';
import { ComplianceAuditComponent } from './components/compliance-audit/compliance-audit.component';

// Dialogs
import { UploadReportDialogComponent } from './dialogs/upload-report-dialog/upload-report-dialog.component';
import { PatientVerifyDialogComponent } from './dialogs/patient-verify-dialog/patient-verify-dialog.component';
import { ReportValidationDialogComponent } from './dialogs/report-validation-dialog/report-validation-dialog.component';
import { ReworkRequestDialogComponent } from './dialogs/rework-request-dialog/rework-request-dialog.component';

// Services
import { LabStaffService } from './services/lab-staff.service';
import { DiagnosticService } from './services/diagnostic.service';
import { ReportUploadService } from './services/report-upload.service';
import { AiIntegrationService } from './services/ai-integration.service';
import { ComplianceService } from './services/compliance.service';

@NgModule({
  declarations: [
    LabStaffDashboardComponent,
    DiagnosticRequestsComponent,
    ReportUploadComponent,
    PatientVerificationComponent,
    DiagnosticHistoryComponent,
    WorklistOverviewComponent,
    AiProcessingStatusComponent,
    ComplianceAuditComponent,
    UploadReportDialogComponent,
    PatientVerifyDialogComponent,
    ReportValidationDialogComponent,
    ReworkRequestDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    LabStaffRoutingModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatBadgeModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule
  ],
  providers: [
    LabStaffService,
    DiagnosticService,
    ReportUploadService,
    AiIntegrationService,
    ComplianceService
  ]
})
export class LabStaffModule { }
    AiIntegrationService,
    ComplianceService
  ]
})
export class LabStaffModule { }