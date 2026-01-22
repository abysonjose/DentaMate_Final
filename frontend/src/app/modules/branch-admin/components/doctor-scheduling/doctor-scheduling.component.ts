import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-doctor-scheduling',
  template: `
    <div class="doctor-scheduling">
      <div class="page-header">
        <h1><mat-icon>schedule</mat-icon> Doctor Scheduling</h1>
        <p>Manage doctor availability and schedules</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Doctor scheduling functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .doctor-scheduling { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class DoctorSchedulingComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}