import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-system-configuration',
  template: `
    <div class="system-configuration">
      <div class="page-header">
        <h1><mat-icon>settings</mat-icon> System Configuration</h1>
        <p>Global system settings and feature toggles</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>System configuration functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .system-configuration { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class SystemConfigurationComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}