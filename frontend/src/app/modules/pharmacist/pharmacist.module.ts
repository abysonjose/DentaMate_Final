import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PharmacistRoutingModule } from './pharmacist-routing.module';
import { PharmacistDashboardComponent } from './components/dashboard/pharmacist-dashboard.component';
import { PrescriptionVerificationComponent } from './components/prescription-verification/prescription-verification.component';
import { MedicineDispensingComponent } from './components/medicine-dispensing/medicine-dispensing.component';
import { InventoryManagementComponent } from './components/inventory-management/inventory-management.component';
import { DispensingHistoryComponent } from './components/dispensing-history/dispensing-history.component';
import { StockAlertsComponent } from './components/stock-alerts/stock-alerts.component';
import { PaymentVerificationComponent } from './components/payment-verification/payment-verification.component';

// Dialogs
import { DispenseMedicineDialogComponent } from './dialogs/dispense-medicine-dialog/dispense-medicine-dialog.component';
import { StockRefillRequestDialogComponent } from './dialogs/stock-refill-request-dialog/stock-refill-request-dialog.component';
import { MedicineReturnDialogComponent } from './dialogs/medicine-return-dialog/medicine-return-dialog.component';
import { PrescriptionDetailsDialogComponent } from './dialogs/prescription-details-dialog/prescription-details-dialog.component';

@NgModule({
  declarations: [
    PharmacistDashboardComponent,
    PrescriptionVerificationComponent,
    MedicineDispensingComponent,
    InventoryManagementComponent,
    DispensingHistoryComponent,
    StockAlertsComponent,
    PaymentVerificationComponent,
    DispenseMedicineDialogComponent,
    StockRefillRequestDialogComponent,
    MedicineReturnDialogComponent,
    PrescriptionDetailsDialogComponent
  ],
  imports: [
    CommonModule,
    PharmacistRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatIconModule,
    MatChipsModule,
    MatBadgeModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ]
})
export class PharmacistModule { }