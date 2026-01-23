import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { HeadNurseRoutingModule } from './head-nurse-routing.module';
import { HeadNurseDashboardComponent } from './components/dashboard/head-nurse-dashboard.component';
import { NursingStaffManagementComponent } from './components/nursing-staff-management/nursing-staff-management.component';
import { PatientFlowMonitoringComponent } from './components/patient-flow-monitoring/patient-flow-monitoring.component';
import { TreatmentAssistanceComponent } from './components/treatment-assistance/treatment-assistance.component';
import { InventoryMonitoringComponent } from './components/inventory-monitoring/inventory-monitoring.component';
import { ComplianceTrackingComponent } from './components/compliance-tracking/compliance-tracking.component';
import { CommunicationCenterComponent } from './components/communication-center/communication-center.component';
import { ReportsAnalyticsComponent } from './components/reports-analytics/reports-analytics.component';

// Dialogs
import { AssignNurseDialogComponent } from './dialogs/assign-nurse-dialog/assign-nurse-dialog.component';
import { TreatmentNotesDialogComponent } from './dialogs/treatment-notes-dialog/treatment-notes-dialog.component';
import { ComplianceChecklistDialogComponent } from './dialogs/compliance-checklist-dialog/compliance-checklist-dialog.component';
import { InventoryRequestDialogComponent } from './dialogs/inventory-request-dialog/inventory-request-dialog.component';

@NgModule({
  declarations: [
    HeadNurseDashboardComponent,
    NursingStaffManagementComponent,
    PatientFlowMonitoringComponent,
    TreatmentAssistanceComponent,
    InventoryMonitoringComponent,
    ComplianceTrackingComponent,
    CommunicationCenterComponent,
    ReportsAnalyticsComponent,
    AssignNurseDialogComponent,
    TreatmentNotesDialogComponent,
    ComplianceChecklistDialogComponent,
    InventoryRequestDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HeadNurseRoutingModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    MatBadgeModule,
    MatProgressBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatMenuModule,
    MatTooltipModule
  ]
})
export class HeadNurseModule { }