import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

import { OrthotistRoutingModule } from './orthotist-routing.module';
import { OrthotistDashboardComponent } from './components/dashboard/orthotist-dashboard.component';
import { CaseManagementComponent } from './components/case-management/case-management.component';
import { MeasurementReviewComponent } from './components/measurement-review/measurement-review.component';
import { FabricationTrackingComponent } from './components/fabrication-tracking/fabrication-tracking.component';
import { DeliveryManagementComponent } from './components/delivery-management/delivery-management.component';
import { CaseHistoryComponent } from './components/case-history/case-history.component';
import { CommunicationCenterComponent } from './components/communication-center/communication-center.component';
import { QualityComplianceComponent } from './components/quality-compliance/quality-compliance.component';

import { CaseDetailsDialogComponent } from './dialogs/case-details-dialog/case-details-dialog.component';
import { FabricationUpdateDialogComponent } from './dialogs/fabrication-update-dialog/fabrication-update-dialog.component';
import { DeliveryScheduleDialogComponent } from './dialogs/delivery-schedule-dialog/delivery-schedule-dialog.component';
import { QualityCheckDialogComponent } from './dialogs/quality-check-dialog/quality-check-dialog.component';
import { DelayReportDialogComponent } from './dialogs/delay-report-dialog/delay-report-dialog.component';

import { OrthotistService } from './services/orthotist.service';

@NgModule({
  declarations: [
    OrthotistDashboardComponent,
    CaseManagementComponent,
    MeasurementReviewComponent,
    FabricationTrackingComponent,
    DeliveryManagementComponent,
    CaseHistoryComponent,
    CommunicationCenterComponent,
    QualityComplianceComponent,
    CaseDetailsDialogComponent,
    FabricationUpdateDialogComponent,
    DeliveryScheduleDialogComponent,
    QualityCheckDialogComponent,
    DelayReportDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    OrthotistRoutingModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatExpansionModule,
    MatListModule,
    MatDividerModule
  ],
  providers: [
    OrthotistService
  ]
})
export class OrthotistModule { }