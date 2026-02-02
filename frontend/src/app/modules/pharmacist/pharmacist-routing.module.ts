import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PharmacistDashboardComponent } from './components/dashboard/pharmacist-dashboard.component';
import { PendingPrescriptionsComponent } from './components/pending-prescriptions/pending-prescriptions.component';
import { DispenseMedicinesComponent } from './components/dispense-medicines/dispense-medicines.component';
import { StockDeductionConfirmationComponent } from './components/stock-deduction-confirmation/stock-deduction-confirmation.component';

const routes: Routes = [
  {
    path: '',
    component: PharmacistDashboardComponent,
    children: [
      { path: '', redirectTo: 'pending-prescriptions', pathMatch: 'full' },
      { path: 'pending-prescriptions', component: PendingPrescriptionsComponent },
      { path: 'dispense-medicines', component: DispenseMedicinesComponent },
      { path: 'stock-deduction-confirmation', component: StockDeductionConfirmationComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PharmacistRoutingModule { }