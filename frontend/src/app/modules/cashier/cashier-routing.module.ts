import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CashierDashboardComponent } from './components/dashboard/cashier-dashboard.component';
import { GenerateBillComponent } from './components/generate-bill/generate-bill.component';
import { AcceptPaymentComponent } from './components/accept-payment/accept-payment.component';
import { InvoiceStatusViewComponent } from './components/invoice-status-view/invoice-status-view.component';

const routes: Routes = [
  {
    path: '',
    component: CashierDashboardComponent,
    children: [
      { path: '', redirectTo: 'generate-bill', pathMatch: 'full' },
      { path: 'generate-bill', component: GenerateBillComponent },
      { path: 'accept-payment', component: AcceptPaymentComponent },
      { path: 'invoice-status-view', component: InvoiceStatusViewComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CashierRoutingModule { }