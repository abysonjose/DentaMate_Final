import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ComplianceChecklist, ComplianceItem } from '../../services/head-nurse.service';

@Component({
  selector: 'app-compliance-checklist-dialog',
  templateUrl: './compliance-checklist-dialog.component.html',
  styleUrls: ['./compliance-checklist-dialog.component.scss']
})
export class ComplianceChecklistDialogComponent implements OnInit {
  checklistForm: FormGroup;
  
  categoryInfo = {
    'ppe_usage': {
      title: 'PPE Usage Compliance',
      icon: 'security',
      description: 'Verify proper use of Personal Protective Equipment'
    },
    'sterilization': {
      title: 'Sterilization Compliance',
      icon: 'cleaning_services',
      description: 'Confirm sterilization procedures are followed'
    },
    'waste_disposal': {
      title: 'Waste Disposal Compliance',
      icon: 'delete',
      description: 'Ensure proper medical waste disposal'
    },
    'room_preparation': {
      title: 'Room Preparation Compliance',
      icon: 'room_service',
      description: 'Verify treatment room setup and cleaning'
    }
  };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ComplianceChecklistDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { checklist: ComplianceChecklist }
  ) {
    this.checklistForm = this.fb.group({
      items: this.fb.array([]),
      completedBy: ['', Validators.required],
      completedAt: [new Date()],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    const itemsArray = this.checklistForm.get('items') as FormArray;
    
    // Clear existing items
    while (itemsArray.length !== 0) {
      itemsArray.removeAt(0);
    }
    
    // Add items from checklist
    if (this.data.checklist.items) {
      this.data.checklist.items.forEach(item => {
        itemsArray.push(this.createItemFormGroup(item));
      });
    }
    
    // Pre-fill completed by if already completed
    if (this.data.checklist.completedBy) {
      this.checklistForm.patchValue({
        completedBy: this.data.checklist.completedBy
      });
    }
  }

  private createItemFormGroup(item: ComplianceItem): FormGroup {
    return this.fb.group({
      id: [item.id],
      description: [item.description],
      completed: [item.completed],
      notes: [item.notes || '']
    });
  }

  get itemsArray(): FormArray {
    return this.checklistForm.get('items') as FormArray;
  }

  onSubmit(): void {
    if (this.checklistForm.valid) {
      const formValue = this.checklistForm.value;
      
      // Check if all items are completed
      const allCompleted = formValue.items.every((item: any) => item.completed);
      
      const result: ComplianceChecklist = {
        ...this.data.checklist,
        items: formValue.items,
        completedBy: formValue.completedBy,
        completedAt: allCompleted ? formValue.completedAt : undefined,
        status: allCompleted ? 'completed' : 'pending'
      };
      
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getCompletionPercentage(): number {
    const items = this.checklistForm.get('items')?.value || [];
    if (items.length === 0) return 0;
    
    const completedItems = items.filter((item: any) => item.completed).length;
    return Math.round((completedItems / items.length) * 100);
  }

  getCompletionColor(): string {
    const percentage = this.getCompletionPercentage();
    if (percentage === 100) return 'primary';
    if (percentage >= 75) return 'accent';
    if (percentage >= 50) return 'warn';
    return 'warn';
  }

  getCategoryInfo() {
    return this.categoryInfo[this.data.checklist.category] || {
      title: 'Compliance Checklist',
      icon: 'fact_check',
      description: 'Complete the compliance checklist'
    };
  }

  toggleAllItems(completed: boolean): void {
    const itemsArray = this.checklistForm.get('items') as FormArray;
    itemsArray.controls.forEach(control => {
      control.patchValue({ completed });
    });
  }

  isReadOnly(): boolean {
    return this.data.checklist.status === 'completed';
  }
}