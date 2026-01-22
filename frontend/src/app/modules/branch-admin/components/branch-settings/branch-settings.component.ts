import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-branch-settings',
  template: `
    <div class="branch-settings">
      <div class="page-header">
        <h1><mat-icon>settings</mat-icon> Branch Settings</h1>
        <p>Working hours and branch configuration</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Branch settings functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .branch-settings { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class BranchSettingsComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}