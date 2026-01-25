import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-safety-security',
  template: `
    <div class="safety-security">
      <div class="page-header">
        <h1>
          <mat-icon>security</mat-icon>
          Safety & Security
        </h1>
      </div>
      <mat-card>
        <mat-card-content>
          <div class="coming-soon">
            <mat-icon>construction</mat-icon>
            <h3>Coming Soon</h3>
            <p>Safety and security management features will be available soon.</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .safety-security { padding: 16px; max-width: 1200px; margin: 0 auto; }
    .page-header h1 { display: flex; align-items: center; gap: 12px; margin: 0 0 24px 0; font-size: 1.8rem; font-weight: 600; color: #333; }
    .page-header h1 .mat-icon { font-size: 28px; color: #2196f3; }
    .coming-soon { text-align: center; padding: 60px 20px; color: #666; }
    .coming-soon .mat-icon { font-size: 64px; color: #ff9800; margin-bottom: 16px; }
    .coming-soon h3 { margin: 0 0 12px 0; font-size: 1.3rem; font-weight: 500; }
    .coming-soon p { margin: 0; font-size: 1rem; line-height: 1.5; }
  `]
})
export class SafetySecurityComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}