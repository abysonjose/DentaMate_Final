import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-patient-profile',
  template: `
    <div class="patient-profile">
      <h1>Patient Profile</h1>
      <p>This component will display comprehensive patient information and medical history.</p>
      <!-- Component implementation will be added in future iterations -->
    </div>
  `,
  styles: [`
    .patient-profile {
      padding: 20px;
    }
  `]
})
export class PatientProfileComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}