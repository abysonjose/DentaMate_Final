import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CashierDashboardComponent } from './components/dashboard/cashier-dashboard.component';
import { InvoiceLookupComponent } from './components/invoice-lookup/invoice-lookup.component';
import { PaymentCollectionComponent } from './components/payment-collection/payment-collection.component';
import { PaymentHistoryComponent } from './components/payment-history/payment-history.component';
import { CashHandlingComponent } from './components/cash-handling/cash-handling.component';
import { PharmacyCoordinationComponent } from './components/pharmacy-coordination/pharmacy-coordination.component';

const routes: Routes = [
  {
    path: '',
    component: CashierDashboardComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: CashierDashboardComponent },
      { path: 'invoice-lookup', component: InvoiceLookupComponent },
      { path: 'payment-collection', component: PaymentCollectionComponent },
      { path: 'payment-history', component: PaymentHistoryComponent },
      { path: 'cash-handling', component: CashHandlingComponent },
      { path: 'pharmacy-coordination', component: PharmacyCoordinationComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CashierRoutingModule { }