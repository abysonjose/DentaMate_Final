import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-case-history',
  template: `
    <div class="page-header">
      <h1><mat-icon>history</mat-icon> Case History</h1>
      <p>View completed orthodontic cases and records</p>
    </div>
    <mat-card>
      <mat-card-content>
        <p>Case history functionality will be implemented here.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-header {
      background: linear-gradient(135deg, #607D8B 0%, #455A64 100%);
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
export class CaseHistoryComponent implements OnInit {
  ngOnInit(): void {}
}