import { Component, OnInit } from '@angular/core';
import { InsuranceService } from '../../services/insurance.service';

@Component({
  selector: 'app-insurer-communication',
  template: `
    <div class="insurer-communication">
      <div class="page-header">
        <h2>Insurer Communication</h2>
        <p>Manage communication and follow-ups with insurance providers</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Insurer Communication component - Implementation in progress</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .insurer-communication {
      padding: 24px;
      .page-header {
        margin-bottom: 24px;
        h2 { margin: 0 0 4px 0; font-size: 28px; font-weight: 500; color: #333; }
        p { margin: 0; color: #666; font-size: 14px; }
      }
    }
  `]
})
export class InsurerCommunicationComponent implements OnInit {
  constructor(private insuranceService: InsuranceService) {}
  ngOnInit(): void {}
}