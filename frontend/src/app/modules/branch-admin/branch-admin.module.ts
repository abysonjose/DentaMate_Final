import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Angular Material Imports
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepperModule } from '@angular/material/stepper';

// Chart.js for analytics
import { NgChartsModule } from 'ng2-charts';

// Routing
import { BranchAdminRoutingModule } from './branch-admin-routing.module';

// Components
import { BranchAdminDashboardComponent } from './components/dashboard/branch-admin-dashboard.component';
import { BranchOverviewComponent } from './components/branch-overview/branch-overview.component';
import { StaffManagementComponent } from './components/staff-management/staff-management.component';
import { DoctorSchedulingComponent } from './components/doctor-scheduling/doctor-scheduling.component';
import { AppointmentSupervisionComponent } from './components/appointment-supervision/appointment-supervision.component';
import { QueueMonitoringComponent } from './components/queue-monitoring/queue-monitoring.component';
import { PatientRecordsComponent } from './components/patient-records/patient-records.component';
import { BillingMonitoringComponent } from './components/billing-monitoring/billing-monitoring.component';
import { InventoryMonitoringComponent } from './components/inventory-monitoring/inventory-monitoring.component';
import { ReportsAnalyticsComponent } from './components/reports-analytics/reports-analytics.component';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';
import { BranchSettingsComponent } from './components/branch-settings/branch-settings.component';
import { AuditLogsComponent } from './components/audit-logs/audit-logs.component';

// Dialogs
import { AddStaffDialogComponent } from './dialogs/add-staff-dialog/add-staff-dialog.component';
import { EditStaffDialogComponent } from './dialogs/edit-staff-dialog/edit-staff-dialog.component';
import { DoctorScheduleDialogComponent } from './dialogs/doctor-schedule-dialog/doctor-schedule-dialog.component';
import { LeaveRequestDialogComponent } from './dialogs/leave-request-dialog/leave-request-dialog.component';
import { IncidentReportDialogComponent } from './dialogs/incident-report-dialog/incident-report-dialog.component';

// Services
import { BranchAdminService } from './services/branch-admin.service';
import { BranchStaffService } from './services/branch-staff.service';
import { BranchAppointmentService } from './services/branch-appointment.service';
import { BranchQueueService } from './services/branch-queue.service';
import { BranchPatientService } from './services/branch-patient.service';
import { BranchBillingService } from './services/branch-billing.service';
import { BranchInventoryService } from './services/branch-inventory.service';
import { BranchReportsService } from './services/branch-reports.service';
import { BranchNotificationService } from './services/branch-notification.service';
import { BranchAuditService } from './services/branch-audit.service';

@NgModule({
  declarations: [
    BranchAdminDashboardComponent,
    BranchOverviewComponent,
    StaffManagementComponent,
    DoctorSchedulingComponent,
    AppointmentSupervisionComponent,
    QueueMonitoringComponent,
    PatientRecordsComponent,
    BillingMonitoringComponent,
    InventoryMonitoringComponent,
    ReportsAnalyticsComponent,
    NotificationCenterComponent,
    BranchSettingsComponent,
    AuditLogsComponent,
    AddStaffDialogComponent,
    EditStaffDialogComponent,
    DoctorScheduleDialogComponent,
    LeaveRequestDialogComponent,
    IncidentReportDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    BranchAdminRoutingModule,
    NgChartsModule,
    
    // Material Modules
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
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatExpansionModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatRadioModule,
    MatBadgeModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatStepperModule
  ],
  providers: [
    BranchAdminService,
    BranchStaffService,
    BranchAppointmentService,
    BranchQueueService,
    BranchPatientService,
    BranchBillingService,
    BranchInventoryService,
    BranchReportsService,
    BranchNotificationService,
    BranchAuditService
  ]
})
export class BranchAdminModule { }