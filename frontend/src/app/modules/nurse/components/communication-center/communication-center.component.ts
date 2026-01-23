import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-communication-center',
  template: `
    <div class="communication-header">
      <h2><mat-icon>chat</mat-icon>Communication Center</h2>
    </div>
    <mat-card>
      <mat-card-content>
        <p>Communication center functionality will be implemented here.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .communication-header h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 20px 0;
      color: #333;
    }
    .communication-header mat-icon { color: #2196F3; }
  `]
})
export class CommunicationCenterComponent implements OnInit {
  ngOnInit(): void {}
}