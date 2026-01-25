import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-expense-oversight',
  template: `
    <div class="expense-oversight">
      <h2>
        <mat-icon>payments</mat-icon>
        Expense Oversight
      </h2>
      <mat-card>
        <mat-card-content>
          <p>Expense oversight functionality will be implemented here.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .expense-oversight {
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
export class ExpenseOversightComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}