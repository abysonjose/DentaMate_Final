import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-sterilization-checklist',
  template: `
    <div class="sterilization-header">
      <h2><mat-icon>cleaning_services</mat-icon>Sterilization & Hygiene Checklist</h2>
    </div>
    <mat-card>
      <mat-card-content>
        <p>Sterilization checklist functionality will be implemented here.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .sterilization-header h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 20px 0;
      color: #333;
    }
    .sterilization-header mat-icon { color: #2196F3; }
  `]
})
export class SterilizationChecklistComponent implements OnInit {
  ngOnInit(): void {}
}