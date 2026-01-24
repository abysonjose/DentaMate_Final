import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dispensing-history',
  template: `
    <div class="dispensing-history">
      <h2>Dispensing History</h2>
      <p>Dispensing history functionality will be implemented here.</p>
    </div>
  `,
  styles: [`
    .dispensing-history {
      padding: 20px;
      background: white;
      border-radius: 8px;
      margin: 20px;
    }
  `]
})
export class DispensingHistoryComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}