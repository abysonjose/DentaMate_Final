import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ReceptionistRoutingModule } from './receptionist-routing.module';

// Components
import { ReceptionistDashboardComponent } from './components/dashboard/receptionist-dashboard.component';
import { PatientRegistrationComponent } from './components/patient-registration/patient-registration.component';
import { AppointmentManagementComponent } from './components/appointment-management/appointment-management.component';
import { CheckInComponent } from './components/check-in/check-in.component';
import { QueueMonitoringComponent } from './components/queue-monitoring/queue-monitoring.component';
import { WalkInHandlingComponent } from './components/walk-in-handling/walk-in-handling.component';
import { LiveDeskViewComponent } from './components/live-desk-view/live-desk-view.component';
import { TokenGenerationComponent } from './components/token-generation/token-generation.component';
import { PatientSearchComponent } from './components/patient-search/patient-search.component';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';

// Dialogs
import { QuickRegistrationDialogComponent } from './dialogs/quick-registration-dialog/quick-registration-dialog.component';
import { AppointmentBookingDialogComponent } from './dialogs/appointment-booking-dialog/appointment-booking-dialog.component';
import { CheckInConfirmationDialogComponent } from './dialogs/check-in-confirmation-dialog/check-in-confirmation-dialog.component';
import { WalkInRegistrationDialogComponent } from './dialogs/walk-in-registration-dialog/walk-in-registration-dialog.component';
import { PatientDetailsDialogComponent } from './dialogs/patient-details-dialog/patient-details-dialog.component';

// Services
import { ReceptionistService } from './services/receptionist.service';
import { PatientRegistrationService } from './services/patient-registration.service';
import { AppointmentService } from './services/appointment.service';
import { CheckInService } from './services/check-in.service';
import { QueueService } from './services/queue.service';
import { TokenService } from './services/token.service';
import { NotificationService } from './services/notification.service';
import { IntegrationService } from './services/integration.service';

@NgModule({
  declarations: [
    ReceptionistDashboardComponent,
    PatientRegistrationComponent,
    AppointmentManagementComponent,
    CheckInComponent,
    QueueMonitoringComponent,
    WalkInHandlingComponent,
    LiveDeskViewComponent,
    TokenGenerationComponent,
    PatientSearchComponent,
    NotificationCenterComponent,
    QuickRegistrationDialogComponent,
    AppointmentBookingDialogComponent,
    CheckInConfirmationDialogComponent,
    WalkInRegistrationDialogComponent,
    PatientDetailsDialogComponent
  ],
  imports: [
    CommonModule,
    ReceptionistRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
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
    MatChipsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatExpansionModule,
    MatStepperModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatTooltipModule
  ],
  providers: [
    ReceptionistService,
    PatientRegistrationService,
    AppointmentService,
    CheckInService,
    QueueService,
    TokenService,
    NotificationService,
    IntegrationService
  ]
})
export class ReceptionistModule { }