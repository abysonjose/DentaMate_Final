import { Component, OnInit } from '@angular/core';
import { InsuranceService } from '../../services/insurance.service';

@Component({
  selector: 'app-claim-submission',
  template: `
    <div class="claim-submission">
      <div class="page-header">
        <h2>Claim Submission</h2>
        <p>Create and submit new insurance claims</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Claim Submission component - Implementation in progress</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .claim-submission {
      padding: 24px;
      .page-header {
        margin-bottom: 24px;
        h2 { margin: 0 0 4px 0; font-size: 28px; font-weight: 500; color: #333; }
        p { margin: 0; color: #666; font-size: 14px; }
      }
    }
  `]
})
export class ClaimSubmissionComponent implements OnInit {
  constructor(private insuranceService: InsuranceService) {}
  ngOnInit(): void {}
}