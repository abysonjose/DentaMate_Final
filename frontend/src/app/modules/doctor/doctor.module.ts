import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material Imports
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
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

// Components
import { DoctorDashboardComponent } from './components/dashboard/doctor-dashboard.component';
import { AppointmentManagementComponent } from './components/appointment-management/appointment-management.component';
import { QueueControlComponent } from './components/queue-control/queue-control.component';
import { ConsultationWorkspaceComponent } from './components/consultation-workspace/consultation-workspace.component';
import { PatientProfileComponent } from './components/patient-profile/patient-profile.component';
import { PrescriptionManagementComponent } from './components/prescription-management/prescription-management.component';
import { AiDiagnosisComponent } from './components/ai-diagnosis/ai-diagnosis.component';
import { LabRequestsComponent } from './components/lab-requests/lab-requests.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { LabNotificationsComponent } from './components/lab-notifications/lab-notifications.component';

// Dialogs
import { ConsultationNotesDialogComponent } from './dialogs/consultation-notes-dialog/consultation-notes-dialog.component';
import { PrescriptionDialogComponent } from './dialogs/prescription-dialog/prescription-dialog.component';
import { LabRequestDialogComponent } from './dialogs/lab-request-dialog/lab-request-dialog.component';
import { PatientHistoryDialogComponent } from './dialogs/patient-history-dialog/patient-history-dialog.component';
import { AiAnalysisDialogComponent } from './dialogs/ai-analysis-dialog/ai-analysis-dialog.component';

// Services
import { DoctorService } from './services/doctor.service';
import { DoctorAppointmentService } from './services/doctor-appointment.service';
import { DoctorQueueService } from './services/doctor-queue.service';
import { DoctorPatientService } from './services/doctor-patient.service';
import { DoctorPrescriptionService } from './services/doctor-prescription.service';
import { DoctorAiService } from './services/doctor-ai.service';
import { DoctorLabService } from './services/doctor-lab.service';

// Shared Services
import { LabDoctorIntegrationService } from '../../shared/services/lab-doctor-integration.service';

// Routing
import { DoctorRoutingModule } from './doctor-routing.module';

@NgModule({
  declarations: [
    DoctorDashboardComponent,
    AppointmentManagementComponent,
    QueueControlComponent,
    ConsultationWorkspaceComponent,
    PatientProfileComponent,
    PrescriptionManagementComponent,
    AiDiagnosisComponent,
    LabRequestsComponent,
    NotificationsComponent,
    LabNotificationsComponent,
    ConsultationNotesDialogComponent,
    PrescriptionDialogComponent,
    LabRequestDialogComponent,
    PatientHistoryDialogComponent,
    AiAnalysisDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    DoctorRoutingModule,
    
    // Material Modules
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
    MatNativeDateModule,
    MatSnackBarModule,
    MatMenuModule,
    MatTooltipModule,
    MatExpansionModule,
    MatListModule,
    MatDividerModule,
    MatCheckboxModule,
    MatAutocompleteModule
  ],
  providers: [
    DoctorService,
    DoctorAppointmentService,
    DoctorQueueService,
    DoctorPatientService,
    DoctorPrescriptionService,
    DoctorAiService,
    DoctorLabService,
    LabDoctorIntegrationService
  ]
})
export class DoctorModule { }