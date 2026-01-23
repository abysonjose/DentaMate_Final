import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { NurseRoutingModule } from './nurse-routing.module';

// Components
import { NurseDashboardComponent } from './components/dashboard/nurse-dashboard.component';
import { ShiftOverviewComponent } from './components/shift-overview/shift-overview.component';
import { PatientPreparationComponent } from './components/patient-preparation/patient-preparation.component';
import { QueueAwarenessComponent } from './components/queue-awareness/queue-awareness.component';
import { ChairmateAssistanceComponent } from './components/chairmate-assistance/chairmate-assistance.component';
import { NursingNotesComponent } from './components/nursing-notes/nursing-notes.component';
import { MedicalRecordsViewComponent } from './components/medical-records-view/medical-records-view.component';
import { SupplyUsageComponent } from './components/supply-usage/supply-usage.component';
import { SterilizationChecklistComponent } from './components/sterilization-checklist/sterilization-checklist.component';
import { CommunicationCenterComponent } from './components/communication-center/communication-center.component';
import { TaskAccountabilityComponent } from './components/task-accountability/task-accountability.component';
import { ClinicalCommunicationComponent } from './components/clinical-communication/clinical-communication.component';

// Dialogs
import { NursingNotesDialogComponent } from './dialogs/nursing-notes-dialog/nursing-notes-dialog.component';
import { PatientPreparationDialogComponent } from './dialogs/patient-preparation-dialog/patient-preparation-dialog.component';
import { SupplyReportDialogComponent } from './dialogs/supply-report-dialog/supply-report-dialog.component';
import { SterilizationConfirmDialogComponent } from './dialogs/sterilization-confirm-dialog/sterilization-confirm-dialog.component';
import { SendMessageDialogComponent } from './dialogs/send-message-dialog/send-message-dialog.component';

import { ClinicalIntegrationService } from '../../shared/services/clinical-integration.service';

// Services
import { NurseService } from './services/nurse.service';

@NgModule({
  declarations: [
    NurseDashboardComponent,
    ShiftOverviewComponent,
    PatientPreparationComponent,
    QueueAwarenessComponent,
    ChairmateAssistanceComponent,
    NursingNotesComponent,
    MedicalRecordsViewComponent,
    SupplyUsageComponent,
    SterilizationChecklistComponent,
    CommunicationCenterComponent,
    TaskAccountabilityComponent,
    ClinicalCommunicationComponent,
    NursingNotesDialogComponent,
    PatientPreparationDialogComponent,
    SupplyReportDialogComponent,
    SterilizationConfirmDialogComponent,
    SendMessageDialogComponent
  ],
  imports: [
    CommonModule,
    NurseRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatListModule,
    MatExpansionModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    NurseService,
    ClinicalIntegrationService
  ]
})
export class NurseModule { }