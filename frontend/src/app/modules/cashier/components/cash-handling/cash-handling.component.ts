import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-cash-handling',
  template: `
    <div class="cash-handling-container">
      <h2>Cash Handling</h2>
      <p>Cash management and shift operations - To be implemented</p>
    </div>
  `,
  styleUrls: ['./cash-handling.component.scss']
})
export class CashHandlingComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}