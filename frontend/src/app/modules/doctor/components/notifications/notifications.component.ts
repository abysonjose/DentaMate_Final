import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-notifications',
  template: `
    <div class="notifications">
      <h1>Notifications</h1>
      <p>This component will display doctor notifications and alerts.</p>
      <!-- Component implementation will be added in future iterations -->
    </div>
  `,
  styles: [`
    .notifications {
      padding: 20px;
    }
  `]
})
export class NotificationsComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
  }
}