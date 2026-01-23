import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-supply-usage',
  template: `
    <div class="supply-header">
      <h2><mat-icon>inventory</mat-icon>Supply Usage Tracking</h2>
    </div>
    <mat-card>
      <mat-card-content>
        <p>Supply usage tracking functionality will be implemented here.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .supply-header h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 20px 0;
      color: #333;
    }
    .supply-header mat-icon { color: #2196F3; }
  `]
})
export class SupplyUsageComponent implements OnInit {
  ngOnInit(): void {}
}