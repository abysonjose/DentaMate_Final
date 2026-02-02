import { Component, OnInit } from '@angular/core';
import { TenantService } from './core/services/tenant.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'DentaMate';

  constructor(private tenantService: TenantService) {}

  ngOnInit() {
    // Initialize tenant context
    this.tenantService.initializeTenant();
  }
}