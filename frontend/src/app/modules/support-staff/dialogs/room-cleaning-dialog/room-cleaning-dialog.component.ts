import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Room, CleaningItem } from '../../services/support-staff.service';

@Component({
  selector: 'app-room-cleaning-dialog',
  templateUrl: './room-cleaning-dialog.component.html',
  styleUrls: ['./room-cleaning-dialog.component.scss']
})
export class RoomCleaningDialogComponent implements OnInit {
  room: Room;
  cleaningItems: CleaningItem[];
  cleaningForm: FormGroup;
  startTime: Date;
  
  constructor(
    public dialogRef: MatDialogRef<RoomCleaningDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { room: Room, cleaningItems: CleaningItem[] },
    private fb: FormBuilder
  ) {
    this.room = data.room;
    this.cleaningItems = data.cleaningItems;
    this.startTime = new Date();
    
    // Initialize form with checklist items
    const formControls: any = {};
    this.cleaningItems.forEach(item => {
      formControls[item.id] = [item.completed];
    });
    formControls['additionalNotes'] = [''];
    
    this.cleaningForm = this.fb.group(formControls);
  }

  ngOnInit(): void {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onComplete(): void {
    if (this.isAllItemsCompleted()) {
      const updatedItems = this.cleaningItems.map(item => ({
        ...item,
        completed: this.cleaningForm.get(item.id)?.value || false,
        timestamp: this.cleaningForm.get(item.id)?.value ? new Date() : undefined
      }));

      const result = {
        checklist: updatedItems,
        additionalNotes: this.cleaningForm.get('additionalNotes')?.value,
        completedAt: new Date(),
        duration: this.getCleaningDuration()
      };

      this.dialogRef.close(result);
    }
  }

  onItemChange(itemId: string): void {
    const item = this.cleaningItems.find(i => i.id === itemId);
    if (item) {
      item.completed = this.cleaningForm.get(itemId)?.value || false;
      if (item.completed) {
        item.timestamp = new Date();
      } else {
        item.timestamp = undefined;
      }
    }
  }

  isAllItemsCompleted(): boolean {
    return this.cleaningItems.every(item => 
      this.cleaningForm.get(item.id)?.value === true
    );
  }

  getCompletedCount(): number {
    return this.cleaningItems.filter(item => 
      this.cleaningForm.get(item.id)?.value === true
    ).length;
  }

  getCompletionPercentage(): number {
    return Math.round((this.getCompletedCount() / this.cleaningItems.length) * 100);
  }

  getCleaningDuration(): number {
    const now = new Date();
    return Math.round((now.getTime() - this.startTime.getTime()) / (1000 * 60)); // in minutes
  }

  getRoomTypeIcon(type: string): string {
    switch (type) {
      case 'CONSULTATION': return 'medical_services';
      case 'TREATMENT': return 'local_hospital';
      case 'WAITING': return 'event_seat';
      case 'UTILITY': return 'build';
      default: return 'meeting_room';
    }
  }

  getItemIcon(item: string): string {
    if (item.toLowerCase().includes('chair') || item.toLowerCase().includes('bed')) {
      return 'chair';
    } else if (item.toLowerCase().includes('floor')) {
      return 'cleaning_services';
    } else if (item.toLowerCase().includes('surface')) {
      return 'cleaning_services';
    } else if (item.toLowerCase().includes('waste')) {
      return 'delete';
    } else if (item.toLowerCase().includes('equipment')) {
      return 'medical_services';
    } else if (item.toLowerCase().includes('linen')) {
      return 'bed';
    } else if (item.toLowerCase().includes('air')) {
      return 'air';
    } else if (item.toLowerCase().includes('inspection')) {
      return 'search';
    }
    return 'check_circle';
  }
}