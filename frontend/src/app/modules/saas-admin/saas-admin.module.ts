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
import { MatAutocompleteModule } from '@angular/material/autocomplete';

// Chart.js for analytics
import { NgChartsModule } from 'ng2-charts';

// Routing
import { SaasAdminRoutingModule } from './saas-admin-routing.module';

// Components
import { SaasAdminDashboardComponent } from './components/dashboard/saas-admin-dashboard.component';
import { PlatformOverviewComponent } from './components/platform-overview/platform-overview.component';
import { LicenseManagementComponent } from './components/license-management/license-management.component';
import { SubscriptionPlansComponent } from './components/subscription-plans/subscription-plans.component';
import { TenantOnboardingComponent } from './components/tenant-onboarding/tenant-onboarding.component';
import { RevenueAnalyticsComponent } from './components/revenue-analytics/revenue-analytics.component';
import { SystemMonitoringComponent } from './components/system-monitoring/system-monitoring.component';
import { FeatureControlComponent } from './components/feature-control/feature-control.component';
import { AuditLogsComponent } from './components/audit-logs/audit-logs.component';
import { MaintenanceControlComponent } from './components/maintenance-control/maintenance-control.component';

// Dialogs
import { IssueLicenseDialogComponent } from './dialogs/issue-license-dialog/issue-license-dialog.component';
import { CreatePlanDialogComponent } from './dialogs/create-plan-dialog/create-plan-dialog.component';
import { CustomPlanDialogComponent } from './dialogs/custom-plan-dialog/custom-plan-dialog.component';
import { SuspendLicenseDialogComponent } from './dialogs/suspend-license-dialog/suspend-license-dialog.component';
import { RevokeLicenseDialogComponent } from './dialogs/revoke-license-dialog/revoke-license-dialog.component';
import { MaintenanceModeDialogComponent } from './dialogs/maintenance-mode-dialog/maintenance-mode-dialog.component';

// Services
import { SaasAdminService } from './services/saas-admin.service';
import { LicenseService } from './services/license.service';
import { SubscriptionPlanService } from './services/subscription-plan.service';
import { SaasAnalyticsService } from './services/saas-analytics.service';
import { SystemMonitoringService } from './services/system-monitoring.service';
import { AuditLogService } from './services/audit-log.service';

@NgModule({
  declarations: [
    // Components
    SaasAdminDashboardComponent,
    PlatformOverviewComponent,
    LicenseManagementComponent,
    SubscriptionPlansComponent,
    TenantOnboardingComponent,
    RevenueAnalyticsComponent,
    SystemMonitoringComponent,
    FeatureControlComponent,
    AuditLogsComponent,
    MaintenanceControlComponent,
    
    // Dialogs
    IssueLicenseDialogComponent,
    CreatePlanDialogComponent,
    CustomPlanDialogComponent,
    SuspendLicenseDialogComponent,
    RevokeLicenseDialogComponent,
    MaintenanceModeDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SaasAdminRoutingModule,
    
    // Angular Material
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
    MatStepperModule,
    MatAutocompleteModule,
    
    // Charts
    NgChartsModule
  ],
  providers: [
    SaasAdminService,
    LicenseService,
    SubscriptionPlanService,
    SaasAnalyticsService,
    SystemMonitoringService,
    AuditLogService
  ]
})
export class SaasAdminModule { }