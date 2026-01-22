import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-prescription-management',
  template: `
    <div class="prescription-management">
      <h1>Prescription Management</h1>
      <p>This component will manage prescriptions, templates, and medication history.</p>
      <!-- Component implementation will be added in future iterations -->
    </div>
  `,
  styles: [`
    .prescription-management {
      padding: 20px;
    }
  `]
})
export class PrescriptionManagementComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}