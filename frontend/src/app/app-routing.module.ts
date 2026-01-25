import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

const routes: Routes = [
  // Public routes
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'login',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  
  // Protected routes
  {
    path: 'dashboard',
    loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },
  
  // Patient module
  {
    path: 'patient',
    loadChildren: () => import('./modules/patient/patient.module').then(m => m.PatientModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['patient'] }
  },
  
  // Doctor module
  {
    path: 'doctor',
    loadChildren: () => import('./modules/doctor/doctor.module').then(m => m.DoctorModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['doctor'] }
  },
  
  // Nurse module
  {
    path: 'nurse',
    loadChildren: () => import('./modules/nurse/nurse.module').then(m => m.NurseModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['nurse'] }
  },
  
  // Accounts Manager module
  {
    path: 'accounts-manager',
    loadChildren: () => import('./modules/accounts-manager/accounts-manager.module').then(m => m.AccountsManagerModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['accounts-manager'] }
  },
  
  // Head Nurse module
  {
    path: 'head-nurse',
    loadChildren: () => import('./modules/head-nurse/head-nurse.module').then(m => m.HeadNurseModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['head-nurse'] }
  },
  
  // Orthotist module
  {
    path: 'orthotist',
    loadChildren: () => import('./modules/orthotist/orthotist.module').then(m => m.OrthotistModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['orthotist'] }
  },
  
  // Receptionist module
  {
    path: 'receptionist',
    loadChildren: () => import('./modules/receptionist/receptionist.module').then(m => m.ReceptionistModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['receptionist'] }
  },
  
  // Appointments
  {
    path: 'appointments',
    loadChildren: () => import('./modules/appointments/appointments.module').then(m => m.AppointmentsModule),
    canActivate: [AuthGuard]
  },
  
  // Billing
  {
    path: 'billing',
    loadChildren: () => import('./modules/billing/billing.module').then(m => m.BillingModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['billing-officer', 'cashier', 'accountant'] }
  },
  
  // Lab Staff module
  {
    path: 'lab-staff',
    loadChildren: () => import('./modules/lab-staff/lab-staff.module').then(m => m.LabStaffModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['lab-staff'] }
  },

  // Pharmacist module
  {
    path: 'pharmacist',
    loadChildren: () => import('./modules/pharmacist/pharmacist.module').then(m => m.PharmacistModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['pharmacist'] }
  },

  // Support Staff module
  {
    path: 'support-staff',
    loadChildren: () => import('./modules/support-staff/support-staff.module').then(m => m.SupportStaffModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['support-staff', 'housekeeping', 'security', 'attendant'] }
  },

  // Billing Staff module
  {
    path: 'billing-staff',
    loadChildren: () => import('./modules/billing-staff/billing-staff.module').then(m => m.BillingStaffModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['billing-staff'] }
  },

  // Cashier module
  {
    path: 'cashier',
    loadChildren: () => import('./modules/cashier/cashier.module').then(m => m.CashierModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['cashier'] }
  },

  // Accountant module
  {
    path: 'accountant',
    loadChildren: () => import('./modules/accountant/accountant.module').then(m => m.AccountantModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['accountant'] }
  },

  // Admin modules
  {
    path: 'branch-admin',
    loadChildren: () => import('./modules/branch-admin/branch-admin.module').then(m => m.BranchAdminModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['branch-admin'] }
  },
  
  {
    path: 'central-admin',
    loadChildren: () => import('./modules/central-admin/central-admin.module').then(m => m.CentralAdminModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['central-admin'] }
  },
  
  {
    path: 'saas-admin',
    loadChildren: () => import('./modules/saas-admin/saas-admin.module').then(m => m.SaasAdminModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['saas-admin'] }
  },
  
  // Default redirects
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/auth/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false,
    preloadingStrategy: undefined
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }