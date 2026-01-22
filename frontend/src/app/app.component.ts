import { Component, OnInit } from '@angular/core';
import { AuthService } from './core/auth/auth.service';
import { TenantService } from './core/services/tenant.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'DentaMate';
  isAuthenticated = false;
  currentUser: any = null;

  constructor(
    private authService: AuthService,
    private tenantService: TenantService
  ) {}

  ngOnInit() {
    // Check authentication status
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.currentUser = user;
    });

    // Initialize tenant context
    this.tenantService.initializeTenant();
  }
}