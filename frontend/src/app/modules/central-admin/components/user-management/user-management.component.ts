import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-user-management',
  template: `
    <div class="user-management">
      <div class="page-header">
        <h1><mat-icon>people</mat-icon> User Management</h1>
        <p>Manage users across all clinics and branches</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>User management functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .user-management { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class UserManagementComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}