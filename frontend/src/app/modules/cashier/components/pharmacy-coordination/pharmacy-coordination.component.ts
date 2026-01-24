import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-pharmacy-coordination',
  template: `
    <div class="pharmacy-coordination-container">
      <h2>Pharmacy Coordination</h2>
      <p>Payment clearance for pharmacy - To be implemented</p>
    </div>
  `,
  styleUrls: ['./pharmacy-coordination.component.scss']
})
export class PharmacyCoordinationComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}