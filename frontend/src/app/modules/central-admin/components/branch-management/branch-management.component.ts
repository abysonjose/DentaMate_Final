import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-branch-management',
  template: `
    <div class="branch-management">
      <div class="page-header">
        <h1><mat-icon>account_tree</mat-icon> Branch Management</h1>
        <p>Manage clinic branches and locations</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Branch management functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .branch-management { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class BranchManagementComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}