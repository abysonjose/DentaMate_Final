import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-subscription-management',
  template: `
    <div class="subscription-management">
      <div class="page-header">
        <h1><mat-icon>payment</mat-icon> Subscription Management</h1>
        <p>Manage subscription plans and billing</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Subscription management functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .subscription-management { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class SubscriptionManagementComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}