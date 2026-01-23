import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { InventoryItem } from '../../services/head-nurse.service';

@Component({
  selector: 'app-inventory-request-dialog',
  templateUrl: './inventory-request-dialog.component.html',
  styleUrls: ['./inventory-request-dialog.component.scss']
})
export class InventoryRequestDialogComponent implements OnInit {
  requestForm: FormGroup;
  
  urgencyOptions = [
    { value: 'low', label: 'Low Priority', description: 'Can wait 1-2 weeks' },
    { value: 'medium', label: 'Medium Priority', description: 'Needed within a week' },
    { value: 'high', label: 'High Priority', description: 'Needed within 2-3 days' },
    { value: 'urgent', label: 'Urgent', description: 'Needed immediately' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InventoryRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { item: InventoryItem }
  ) {
    this.requestForm = this.fb.group({
      quantity: ['', [Validators.required, Validators.min(1)]],
      urgency: ['medium', Validators.required],
      justification: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Set default quantity based on item status
    const defaultQuantity = this.calculateDefaultQuantity();
    this.requestForm.patchValue({
      quantity: defaultQuantity,
      urgency: this.data.item.status === 'critical' ? 'urgent' : 'medium'
    });
  }

  private calculateDefaultQuantity(): number {
    const item = this.data.item;
    const shortage = item.minimumStock - item.currentStock;
    
    if (shortage > 0) {
      // Request enough to reach 2x minimum stock
      return shortage + item.minimumStock;
    } else {
      // Request minimum stock amount
      return item.minimumStock;
    }
  }

  onSubmit(): void {
    if (this.requestForm.valid) {
      const formValue = this.requestForm.value;
      
      const result = {
        quantity: formValue.quantity,
        urgency: formValue.urgency,
        justification: formValue.justification,
        notes: formValue.notes
      };
      
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getUrgencyColor(urgency: string): string {
    const colors = {
      'low': 'primary',
      'medium': 'accent',
      'high': 'warn',
      'urgent': 'warn'
    };
    return colors[urgency] || 'primary';
  }

  getStatusColor(status: string): string {
    const colors = {
      'ok': 'primary',
      'low': 'accent',
      'critical': 'warn'
    };
    return colors[status] || 'basic';
  }

  getCategoryIcon(category: string): string {
    const icons = {
      'clinical_consumables': 'medical_services',
      'dental_supplies': 'build',
      'hygiene_sterilization': 'cleaning_services',
      'room_equipment': 'chair'
    };
    return icons[category] || 'inventory';
  }
}