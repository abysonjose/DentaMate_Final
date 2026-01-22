import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-patient-records',
  template: `
    <div class="patient-records">
      <div class="page-header">
        <h1><mat-icon>folder_shared</mat-icon> Patient Records</h1>
        <p>Read-only access to patient information</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Patient records functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .patient-records { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class PatientRecordsComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}