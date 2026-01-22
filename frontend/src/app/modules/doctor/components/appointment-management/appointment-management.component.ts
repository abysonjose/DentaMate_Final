import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-appointment-management',
  template: `
    <div class="appointment-management">
      <h1>Appointment Management</h1>
      <p>This component will manage doctor's appointments view and actions.</p>
      <!-- Component implementation will be added in future iterations -->
    </div>
  `,
  styles: [`
    .appointment-management {
      padding: 20px;
    }
  `]
})
export class AppointmentManagementComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}