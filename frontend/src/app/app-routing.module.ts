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
  
  // Head Nurse module
  {
    path: 'head-nurse',
    loadChildren: () => import('./modules/head-nurse/head-nurse.module').then(m => m.HeadNurseModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['head-nurse'] }
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