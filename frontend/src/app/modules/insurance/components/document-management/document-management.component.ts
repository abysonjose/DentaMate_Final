import { Component, OnInit } from '@angular/core';
import { InsuranceService } from '../../services/insurance.service';

@Component({
  selector: 'app-document-management',
  template: `
    <div class="document-management">
      <div class="page-header">
        <h2>Document Management</h2>
        <p>Manage claim documents and evidence</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Document Management component - Implementation in progress</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .document-management {
      padding: 24px;
      .page-header {
        margin-bottom: 24px;
        h2 { margin: 0 0 4px 0; font-size: 28px; font-weight: 500; color: #333; }
        p { margin: 0; color: #666; font-size: 14px; }
      }
    }
  `]
})
export class DocumentManagementComponent implements OnInit {
  constructor(private insuranceService: InsuranceService) {}
  ngOnInit(): void {}
}