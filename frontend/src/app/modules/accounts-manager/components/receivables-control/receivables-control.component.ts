import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-receivables-control',
  template: `
    <div class="receivables-control">
      <h2>
        <mat-icon>account_balance</mat-icon>
        Receivables Control
      </h2>
      <mat-card>
        <mat-card-content>
          <p>Receivables control functionality will be implemented here.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .receivables-control {
      padding: 24px;
      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #1976d2;
        margin-bottom: 24px;
      }
    }
  `]
})
export class ReceivablesControlComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}