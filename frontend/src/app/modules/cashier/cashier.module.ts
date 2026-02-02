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
import { MatRadioModule } from '@angular/material/radio';
import { MatStepperModule } from '@angular/material/stepper';

// Components
import { CashierDashboardComponent } from './components/dashboard/cashier-dashboard.component';
import { GenerateBillComponent } from './components/generate-bill/generate-bill.component';
import { AcceptPaymentComponent } from './components/accept-payment/accept-payment.component';
import { InvoiceStatusViewComponent } from './components/invoice-status-view/invoice-status-view.component';

// Dialogs
import { InvoiceDetailsDialogComponent } from './dialogs/invoice-details-dialog/invoice-details-dialog.component';
import { PaymentConfirmationDialogComponent } from './dialogs/payment-confirmation-dialog/payment-confirmation-dialog.component';

// Services
import { CashierService } from './services/cashier.service';
import { CashierBillingService } from './services/cashier-billing.service';
import { CashierPaymentService } from './services/cashier-payment.service';

// Routing
import { CashierRoutingModule } from './cashier-routing.module';

@NgModule({
  declarations: [
    CashierDashboardComponent,
    GenerateBillComponent,
    AcceptPaymentComponent,
    InvoiceStatusViewComponent,
    InvoiceDetailsDialogComponent,
    PaymentConfirmationDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    CashierRoutingModule,
    
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
    MatSortModule,
    MatRadioModule,
    MatStepperModule
  ],
  providers: [
    CashierService,
    CashierBillingService,
    CashierPaymentService
  ]
})
export class CashierModule { }