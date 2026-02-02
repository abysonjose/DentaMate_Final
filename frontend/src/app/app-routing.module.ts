import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { MainLayoutComponent } from './layout/main-layout.component';

const routes: Routes = [
  // Public routes (no layout)
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'login',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  
  // Protected routes with layout
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      // Dashboard
      {
        path: 'dashboard',
        loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      
      // Patient module
      {
        path: 'patient',
        loadChildren: () => import('./modules/patient/patient.module').then(m => m.PatientModule),
        canActivate: [RoleGuard],
        data: { roles: ['patient'] }
      },
      
      // Nurse module
      {
        path: 'nurse',
        loadChildren: () => import('./modules/nurse/nurse.module').then(m => m.NurseModule),
        canActivate: [RoleGuard],
        data: { roles: ['nurse'] }
      },
      
      // Receptionist module
      {
        path: 'receptionist',
        loadChildren: () => import('./modules/receptionist/receptionist.module').then(m => m.ReceptionistModule),
        canActivate: [RoleGuard],
        data: { roles: ['receptionist'] }
      },
      
      // Lab Staff module
      {
        path: 'lab-staff',
        loadChildren: () => import('./modules/lab-staff/lab-staff.module').then(m => m.LabStaffModule),
        canActivate: [RoleGuard],
        data: { roles: ['lab-staff', 'lab-technician'] }
      },
      
      // Doctor module
      {
        path: 'doctor',
        loadChildren: () => import('./modules/doctor/doctor.module').then(m => m.DoctorModule),
        canActivate: [RoleGuard],
        data: { roles: ['doctor'] }
      },
      
      // Pharmacist module
      {
        path: 'pharmacist',
        loadChildren: () => import('./modules/pharmacist/pharmacist.module').then(m => m.PharmacistModule),
        canActivate: [RoleGuard],
        data: { roles: ['pharmacist'] }
      },
      
      // Cashier module
      {
        path: 'cashier',
        loadChildren: () => import('./modules/cashier/cashier.module').then(m => m.CashierModule),
        canActivate: [RoleGuard],
        data: { roles: ['cashier'] }
      },
      
      // Admin modules
      {
        path: 'branch-admin',
        loadChildren: () => import('./modules/branch-admin/branch-admin.module').then(m => m.BranchAdminModule),
        canActivate: [RoleGuard],
        data: { roles: ['branch-admin'] }
      },
      
      {
        path: 'central-admin',
        loadChildren: () => import('./modules/central-admin/central-admin.module').then(m => m.CentralAdminModule),
        canActivate: [RoleGuard],
        data: { roles: ['central-admin'] }
      }
    ]
  },
  
  // Default redirects
  { 
    path: '', 
    redirectTo: '/dashboard', 
    pathMatch: 'full' 
  },
  { 
    path: '**', 
    redirectTo: '/auth/login' 
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false,
    preloadingStrategy: undefined
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }