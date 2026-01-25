import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-quality-compliance',
  template: `
    <div class="page-header">
      <h1><mat-icon>verified</mat-icon> Quality & Compliance</h1>
      <p>Quality control and compliance tracking</p>
    </div>
    <mat-card>
      <mat-card-content>
        <p>Quality and compliance functionality will be implemented here.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-header {
      background: linear-gradient(135deg, #E91E63 0%, #C2185B 100%);
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
export class QualityComplianceComponent implements OnInit {
  ngOnInit(): void {}
}