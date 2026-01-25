import { Component, OnInit } from '@angular/core';
import { InsuranceService } from '../../services/insurance.service';

@Component({
  selector: 'app-patient-insurance',
  template: `
    <div class="patient-insurance">
      <div class="page-header">
        <h2>Patient Insurance Management</h2>
        <p>Manage patient insurance profiles and verify eligibility</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Patient Insurance Management component - Implementation in progress</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .patient-insurance {
      padding: 24px;
      .page-header {
        margin-bottom: 24px;
        h2 { margin: 0 0 4px 0; font-size: 28px; font-weight: 500; color: #333; }
        p { margin: 0; color: #666; font-size: 14px; }
      }
    }
  `]
})
export class PatientInsuranceComponent implements OnInit {
  constructor(private insuranceService: InsuranceService) {}
  ngOnInit(): void {}
}