import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-payment-collection',
  template: `
    <div class="payment-collection-container">
      <h2>Payment Collection</h2>
      <p>Payment collection interface - To be implemented</p>
    </div>
  `,
  styleUrls: ['./payment-collection.component.scss']
})
export class PaymentCollectionComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}