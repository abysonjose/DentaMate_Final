import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-reports',
  template: `
    <div class="reports">
      <div class="page-header">
        <h1><mat-icon>assessment</mat-icon> Reports</h1>
        <p>Generate and download comprehensive reports</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Reports functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .reports { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class ReportsComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}