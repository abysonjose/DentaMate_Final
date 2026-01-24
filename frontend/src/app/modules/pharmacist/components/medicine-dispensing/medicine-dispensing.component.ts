import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-medicine-dispensing',
  template: `
    <div class="medicine-dispensing">
      <h2>Medicine Dispensing</h2>
      <p>Medicine dispensing functionality will be implemented here.</p>
    </div>
  `,
  styles: [`
    .medicine-dispensing {
      padding: 20px;
      background: white;
      border-radius: 8px;
      margin: 20px;
    }
  `]
})
export class MedicineDispensingComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}