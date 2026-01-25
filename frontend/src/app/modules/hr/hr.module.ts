import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { HrRoutingModule } from './hr-routing.module';

// Components
import { HrDashboardComponent } from './components/dashboard/hr-dashboard.component';
import { EmployeeManagementComponent } from './components/employee-management/employee-management.component';
import { AttendanceManagementComponent } from './components/attendance-management/attendance-management.component';
import { ShiftManagementComponent } from './components/shift-management/shift-management.component';
import { LeaveManagementComponent } from './components/leave-management/leave-management.component';
import { DocumentManagementComponent } from './components/document-management/document-management.component';
import { ReportsComponent } from './components/reports/reports.component';
import { ComplianceTrackingComponent } from './components/compliance-tracking/compliance-tracking.component';

// Dialogs
import { AddEmployeeDialogComponent } from './dialogs/add-employee-dialog/add-employee-dialog.component';
import { EditEmployeeDialogComponent } from './dialogs/edit-employee-dialog/edit-employee-dialog.component';
import { AttendanceRecordDialogComponent } from './dialogs/attendance-record-dialog/attendance-record-dialog.component';
import { ShiftAssignmentDialogComponent } from './dialogs/shift-assignment-dialog/shift-assignment-dialog.component';
import { LeaveApprovalDialogComponent } from './dialogs/leave-approval-dialog/leave-approval-dialog.component';
import { DocumentUploadDialogComponent } from './dialogs/document-upload-dialog/document-upload-dialog.component';

// Services
import { HrService } from './services/hr.service';
import { EmployeeService } from './services/employee.service';
import { AttendanceService } from './services/attendance.service';
import { ShiftService } from './services/shift.service';
import { LeaveService } from './services/leave.service';
import { DocumentService } from './services/document.service';
import { ComplianceService } from './services/compliance.service';

@NgModule({
  declarations: [
    HrDashboardComponent,
    EmployeeManagementComponent,
    AttendanceManagementComponent,
    ShiftManagementComponent,
    LeaveManagementComponent,
    DocumentManagementComponent,
    ReportsComponent,
    ComplianceTrackingComponent,
    AddEmployeeDialogComponent,
    EditEmployeeDialogComponent,
    AttendanceRecordDialogComponent,
    ShiftAssignmentDialogComponent,
    LeaveApprovalDialogComponent,
    DocumentUploadDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HrRoutingModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatTabsModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatSlideToggleModule
  ],
  providers: [
    HrService,
    EmployeeService,
    AttendanceService,
    ShiftService,
    LeaveService,
    DocumentService,
    ComplianceService
  ]
})
export class HrModule { }