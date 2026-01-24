import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CashierRoutingModule } from './cashier-routing.module';

// Components
import { CashierDashboardComponent } from './components/dashboard/cashier-dashboard.component';
import { InvoiceLookupComponent } from './components/invoice-lookup/invoice-lookup.component';
import { PaymentCollectionComponent } from './components/payment-collection/payment-collection.component';
import { ReceiptGenerationComponent } from './components/receipt-generation/receipt-generation.component';
import { CashHandlingComponent } from './components/cash-handling/cash-handling.component';
import { PaymentHistoryComponent } from './components/payment-history/payment-history.component';
import { PharmacyCoordinationComponent } from './components/pharmacy-coordination/pharmacy-coordination.component';

// Dialogs
import { PaymentDialogComponent } from './dialogs/payment-dialog/payment-dialog.component';
import { ReceiptDialogComponent } from './dialogs/receipt-dialog/receipt-dialog.component';
import { ShiftClosureDialogComponent } from './dialogs/shift-closure-dialog/shift-closure-dialog.component';
import { PaymentDisputeDialogComponent } from './dialogs/payment-dispute-dialog/payment-dispute-dialog.component';

// Services
import { CashierService } from './services/cashier.service';
import { PaymentService } from './services/payment.service';
import { ReceiptService } from './services/receipt.service';
import { CashHandlingService } from './services/cash-handling.service';

@NgModule({
  declarations: [
    CashierDashboardComponent,
    InvoiceLookupComponent,
    PaymentCollectionComponent,
    ReceiptGenerationComponent,
    CashHandlingComponent,
    PaymentHistoryComponent,
    PharmacyCoordinationComponent,
    PaymentDialogComponent,
    ReceiptDialogComponent,
    ShiftClosureDialogComponent,
    PaymentDisputeDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CashierRoutingModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatSnackBarModule,
    MatIconModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  providers: [
    CashierService,
    PaymentService,
    ReceiptService,
    CashHandlingService
  ]
})
export class CashierModule { }