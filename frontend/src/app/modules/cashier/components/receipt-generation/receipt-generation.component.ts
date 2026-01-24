import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-receipt-generation',
  template: `
    <div class="receipt-generation-container">
      <h2>Receipt Generation</h2>
      <p>Receipt generation and management - To be implemented</p>
    </div>
  `,
  styleUrls: ['./receipt-generation.component.scss']
})
export class ReceiptGenerationComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}