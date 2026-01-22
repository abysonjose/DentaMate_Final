import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-queue-monitoring',
  template: `
    <div class="queue-monitoring">
      <div class="page-header">
        <h1><mat-icon>queue</mat-icon> Queue Monitoring</h1>
        <p>Real-time patient queue oversight</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Queue monitoring functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .queue-monitoring { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class QueueMonitoringComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}