import { Component, OnInit } from '@angular/core';
import { InsuranceService } from '../../services/insurance.service';

@Component({
  selector: 'app-reports-analytics',
  template: `
    <div class="reports-analytics">
      <div class="page-header">
        <h2>Reports & Analytics</h2>
        <p>Generate insurance reports and view analytics</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Reports & Analytics component - Implementation in progress</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .reports-analytics {
      padding: 24px;
      .page-header {
        margin-bottom: 24px;
        h2 { margin: 0 0 4px 0; font-size: 28px; font-weight: 500; color: #333; }
        p { margin: 0; color: #666; font-size: 14px; }
      }
    }
  `]
})
export class ReportsAnalyticsComponent implements OnInit {
  constructor(private insuranceService: InsuranceService) {}
  ngOnInit(): void {}
}