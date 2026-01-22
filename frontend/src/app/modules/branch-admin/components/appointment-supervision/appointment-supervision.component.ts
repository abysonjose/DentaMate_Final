import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-appointment-supervision',
  template: `
    <div class="appointment-supervision">
      <div class="page-header">
        <h1><mat-icon>event</mat-icon> Appointment Supervision</h1>
        <p>Monitor and manage branch appointments</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Appointment supervision functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .appointment-supervision { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class AppointmentSupervisionComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}