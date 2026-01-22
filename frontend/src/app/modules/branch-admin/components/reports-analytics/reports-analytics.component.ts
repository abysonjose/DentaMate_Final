import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-reports-analytics',
  template: `
    <div class="reports-analytics">
      <div class="page-header">
        <h1><mat-icon>analytics</mat-icon> Reports & Analytics</h1>
        <p>Performance insights and data export</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Reports and analytics functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .reports-analytics { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class ReportsAnalyticsComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}