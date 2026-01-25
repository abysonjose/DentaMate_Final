import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-communication-center',
  template: `
    <div class="page-header">
      <h1><mat-icon>message</mat-icon> Communication Center</h1>
      <p>Internal messaging and notifications</p>
    </div>
    <mat-card>
      <mat-card-content>
        <p>Communication center functionality will be implemented here.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-header {
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }
    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.5rem 0;
    }
  `]
})
export class CommunicationCenterComponent implements OnInit {
  ngOnInit(): void {}
}