import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Task } from '../../services/support-staff.service';

@Component({
  selector: 'app-task-details-dialog',
  templateUrl: './task-details-dialog.component.html',
  styleUrls: ['./task-details-dialog.component.scss']
})
export class TaskDetailsDialogComponent implements OnInit {
  task: Task;
  notesForm: FormGroup;
  
  constructor(
    public dialogRef: MatDialogRef<TaskDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { task: Task },
    private fb: FormBuilder
  ) {
    this.task = data.task;
    this.notesForm = this.fb.group({
      notes: [this.task.notes || '', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.notesForm.valid) {
      const updatedTask = {
        ...this.task,
        notes: this.notesForm.get('notes')?.value
      };
      this.dialogRef.close(updatedTask);
    }
  }

  getTaskPriorityColor(priority: string): string {
    switch (priority) {
      case 'URGENT': return 'warn';
      case 'HIGH': return 'accent';
      case 'MEDIUM': return 'primary';
      default: return '';
    }
  }

  getTaskStatusIcon(status: string): string {
    switch (status) {
      case 'ASSIGNED': return 'assignment';
      case 'IN_PROGRESS': return 'hourglass_empty';
      case 'COMPLETED': return 'check_circle';
      default: return 'help';
    }
  }

  getTaskTypeIcon(type: string): string {
    switch (type) {
      case 'CLEANING': return 'cleaning_services';
      case 'ASSISTANCE': return 'accessible';
      case 'SECURITY': return 'security';
      case 'MAINTENANCE': return 'build';
      default: return 'assignment';
    }
  }

  getElapsedTime(): string {
    if (this.task.status !== 'IN_PROGRESS') return '';
    
    const now = new Date();
    const assignedAt = new Date(this.task.assignedAt);
    const elapsed = now.getTime() - assignedAt.getTime();
    
    const minutes = Math.floor(elapsed / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }
}