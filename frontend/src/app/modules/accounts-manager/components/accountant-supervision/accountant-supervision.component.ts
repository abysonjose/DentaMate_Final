import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-accountant-supervision',
  template: `
    <div class="accountant-supervision">
      <h2>
        <mat-icon>supervisor_account</mat-icon>
        Accountant Supervision
      </h2>
      <mat-card>
        <mat-card-content>
          <p>Accountant supervision functionality will be implemented here.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .accountant-supervision {
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
export class AccountantSupervisionComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}