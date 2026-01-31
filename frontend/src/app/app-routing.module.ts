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
  
  // Admin modules (working ones)
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