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

// Chart.js for analytics
import { NgChartsModule } from 'ng2-charts';

// Routing
import { CentralAdminRoutingModule } from './central-admin-routing.module';

// Components
import { CentralAdminDashboardComponent } from './components/dashboard/central-admin-dashboard.component';
import { ClinicManagementComponent } from './components/clinic-management/clinic-management.component';
import { BranchManagementComponent } from './components/branch-management/branch-management.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { SubscriptionManagementComponent } from './components/subscription-management/subscription-management.component';
import { AnalyticsOverviewComponent } from './components/analytics-overview/analytics-overview.component';
import { AiSystemMonitoringComponent } from './components/ai-system-monitoring/ai-system-monitoring.component';
import { FinancialAnalyticsComponent } from './components/financial-analytics/financial-analytics.component';
import { SystemConfigurationComponent } from './components/system-configuration/system-configuration.component';
import { AuditLogsComponent } from './components/audit-logs/audit-logs.component';
import { ReportsComponent } from './components/reports/reports.component';

// Dialogs
import { CreateClinicDialogComponent } from './dialogs/create-clinic-dialog/create-clinic-dialog.component';
import { CreateBranchDialogComponent } from './dialogs/create-branch-dialog/create-branch-dialog.component';
import { EditUserDialogComponent } from './dialogs/edit-user-dialog/edit-user-dialog.component';
import { SubscriptionPlanDialogComponent } from './dialogs/subscription-plan-dialog/subscription-plan-dialog.component';

// Services
import { CentralAdminService } from './services/central-admin.service';
import { ClinicService } from './services/clinic.service';
import { BranchService } from './services/branch.service';
import { UserManagementService } from './services/user-management.service';
import { SubscriptionService } from './services/subscription.service';
import { AnalyticsService } from './services/analytics.service';
import { AiMonitoringService } from './services/ai-monitoring.service';
import { AuditService } from './services/audit.service';

@NgModule({
  declarations: [
    CentralAdminDashboardComponent,
    ClinicManagementComponent,
    BranchManagementComponent,
    UserManagementComponent,
    SubscriptionManagementComponent,
    AnalyticsOverviewComponent,
    AiSystemMonitoringComponent,
    FinancialAnalyticsComponent,
    SystemConfigurationComponent,
    AuditLogsComponent,
    ReportsComponent,
    CreateClinicDialogComponent,
    CreateBranchDialogComponent,
    EditUserDialogComponent,
    SubscriptionPlanDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CentralAdminRoutingModule,
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
    MatTooltipModule
  ],
  providers: [
    CentralAdminService,
    ClinicService,
    BranchService,
    UserManagementService,
    SubscriptionService,
    AnalyticsService,
    AiMonitoringService,
    AuditService
  ]
})
export class CentralAdminModule { }