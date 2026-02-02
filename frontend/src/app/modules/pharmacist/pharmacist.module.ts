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
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';

// Components
import { PharmacistDashboardComponent } from './components/dashboard/pharmacist-dashboard.component';
import { PendingPrescriptionsComponent } from './components/pending-prescriptions/pending-prescriptions.component';
import { DispenseMedicinesComponent } from './components/dispense-medicines/dispense-medicines.component';
import { StockDeductionConfirmationComponent } from './components/stock-deduction-confirmation/stock-deduction-confirmation.component';

// Dialogs
import { PrescriptionDetailsDialogComponent } from './dialogs/prescription-details-dialog/prescription-details-dialog.component';
import { DispenseConfirmationDialogComponent } from './dialogs/dispense-confirmation-dialog/dispense-confirmation-dialog.component';

// Services
import { PharmacistService } from './services/pharmacist.service';
import { PharmacistPrescriptionService } from './services/pharmacist-prescription.service';
import { PharmacistInventoryService } from './services/pharmacist-inventory.service';

// Routing
import { PharmacistRoutingModule } from './pharmacist-routing.module';

@NgModule({
  declarations: [
    PharmacistDashboardComponent,
    PendingPrescriptionsComponent,
    DispenseMedicinesComponent,
    StockDeductionConfirmationComponent,
    PrescriptionDetailsDialogComponent,
    DispenseConfirmationDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    PharmacistRoutingModule,
    
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
    MatAutocompleteModule,
    MatPaginatorModule,
    MatSortModule
  ],
  providers: [
    PharmacistService,
    PharmacistPrescriptionService,
    PharmacistInventoryService
  ]
})
export class PharmacistModule { }