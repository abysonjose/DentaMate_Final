import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-notification-center',
  template: `
    <div class="notification-center">
      <div class="page-header">
        <h1><mat-icon>notifications</mat-icon> Notification Center</h1>
        <p>Staff announcements and communication</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Notification center functionality coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .notification-center { padding: 24px; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0; }
    .page-header p { margin: 8px 0 0 0; color: #666; }
  `]
})
export class NotificationCenterComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}