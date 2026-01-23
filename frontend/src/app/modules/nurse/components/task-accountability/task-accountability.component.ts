import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-task-accountability',
  template: `
    <div class="task-header">
      <h2><mat-icon>task_alt</mat-icon>Task & Accountability Logs</h2>
    </div>
    <mat-card>
      <mat-card-content>
        <p>Task accountability functionality will be implemented here.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .task-header h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 20px 0;
      color: #333;
    }
    .task-header mat-icon { color: #2196F3; }
  `]
})
export class TaskAccountabilityComponent implements OnInit {
  ngOnInit(): void {}
}