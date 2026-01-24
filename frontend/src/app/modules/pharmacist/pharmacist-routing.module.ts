import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PharmacistDashboardComponent } from './components/dashboard/pharmacist-dashboard.component';
import { PrescriptionVerificationComponent } from './components/prescription-verification/prescription-verification.component';
import { MedicineDispensingComponent } from './components/medicine-dispensing/medicine-dispensing.component';
import { InventoryManagementComponent } from './components/inventory-management/inventory-management.component';
import { DispensingHistoryComponent } from './components/dispensing-history/dispensing-history.component';
import { StockAlertsComponent } from './components/stock-alerts/stock-alerts.component';

const routes: Routes = [
  {
    path: '',
    component: PharmacistDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: PharmacistDashboardComponent },
      { path: 'prescriptions', component: PrescriptionVerificationComponent },
      { path: 'dispensing', component: MedicineDispensingComponent },
      { path: 'inventory', component: InventoryManagementComponent },
      { path: 'history', component: DispensingHistoryComponent },
      { path: 'alerts', component: StockAlertsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PharmacistRoutingModule { }