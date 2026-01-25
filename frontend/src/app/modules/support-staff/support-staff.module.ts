import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { SupportStaffRoutingModule } from './support-staff-routing.module';

// Components
import { SupportStaffDashboardComponent } from './components/dashboard/support-staff-dashboard.component';
import { TaskManagementComponent } from './components/task-management/task-management.component';
import { RoomReadinessComponent } from './components/room-readiness/room-readiness.component';
import { PatientAssistanceComponent } from './components/patient-assistance/patient-assistance.component';
import { SafetySecurityComponent } from './components/safety-security/safety-security.component';
import { ActivityLogComponent } from './components/activity-log/activity-log.component';
import { ShiftOverviewComponent } from './components/shift-overview/shift-overview.component';
import { CommunicationCenterComponent } from './components/communication-center/communication-center.component';

// Dialogs
import { TaskDetailsDialogComponent } from './dialogs/task-details-dialog/task-details-dialog.component';
import { RoomCleaningDialogComponent } from './dialogs/room-cleaning-dialog/room-cleaning-dialog.component';
import { IncidentReportDialogComponent } from './dialogs/incident-report-dialog/incident-report-dialog.component';
import { ComplianceChecklistDialogComponent } from './dialogs/compliance-checklist-dialog/compliance-checklist-dialog.component';

// Services
import { SupportStaffService } from './services/support-staff.service';

@NgModule({
  declarations: [
    SupportStaffDashboardComponent,
    TaskManagementComponent,
    RoomReadinessComponent,
    PatientAssistanceComponent,
    SafetySecurityComponent,
    ActivityLogComponent,
    ShiftOverviewComponent,
    CommunicationCenterComponent,
    TaskDetailsDialogComponent,
    RoomCleaningDialogComponent,
    IncidentReportDialogComponent,
    ComplianceChecklistDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SupportStaffRoutingModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatChipsModule,
    MatListModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTabsModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  providers: [
    SupportStaffService
  ]
})
export class SupportStaffModule { }