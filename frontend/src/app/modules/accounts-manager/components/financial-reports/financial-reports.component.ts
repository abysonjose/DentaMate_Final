import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-financial-reports',
  template: `
    <div class="financial-reports">
      <h2>
        <mat-icon>assessment</mat-icon>
        Financial Reports
      </h2>
      <mat-card>
        <mat-card-content>
          <p>Financial reports functionality will be implemented here.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .financial-reports {
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
export class FinancialReportsComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}