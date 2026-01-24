import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-stock-alerts',
  template: `
    <div class="stock-alerts">
      <h2>Stock Alerts</h2>
      <p>Stock alerts functionality will be implemented here.</p>
    </div>
  `,
  styles: [`
    .stock-alerts {
      padding: 20px;
      background: white;
      border-radius: 8px;
      margin: 20px;
    }
  `]
})
export class StockAlertsComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}