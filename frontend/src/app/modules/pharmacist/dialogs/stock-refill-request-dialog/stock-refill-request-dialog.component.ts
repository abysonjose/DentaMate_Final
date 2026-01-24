import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PharmacistService, StockRefillRequest } from '../../services/pharmacist.service';

@Component({
  selector: 'app-stock-refill-request-dialog',
  templateUrl: './stock-refill-request-dialog.component.html',
  styleUrls: ['./stock-refill-request-dialog.component.scss']
})
export class StockRefillRequestDialogComponent implements OnInit {
  refillForm: FormGroup;
  isSubmitting = false;

  priorityOptions = [
    { value: 'low', label: 'Low', description: 'Can wait for regular restocking' },
    { value: 'medium', label: 'Medium', description: 'Needed within a week' },
    { value: 'high', label: 'High', description: 'Needed within 2-3 days' },
    { value: 'urgent', label: 'Urgent', description: 'Needed immediately' }
  ];

  reasonOptions = [
    'Low stock level reached',
    'High demand medicine',
    'Upcoming expiry of current stock',
    'Seasonal demand increase',
    'Emergency requirement',
    'Other'
  ];

  constructor(
    public dialogRef: MatDialogRef<StockRefillRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      medicineId: string;
      medicineName: string;
      currentStock: number;
      minStockLevel?: number;
    },
    private fb: FormBuilder,
    private pharmacistService: PharmacistService,
    private snackBar: MatSnackBar
  ) {
    this.refillForm = this.createForm();
  }

  ngOnInit(): void {
    this.setDefaultValues();
  }

  createForm(): FormGroup {
    return this.fb.group({
      requestedQuantity: ['', [Validators.required, Validators.min(1)]],
      priority: ['medium', Validators.required],
      reason: ['', Validators.required],
      customReason: [''],
      notes: [''],
      urgentJustification: ['']
    });
  }

  setDefaultValues(): void {
    // Calculate suggested quantity based on min stock level
    const suggestedQuantity = this.data.minStockLevel 
      ? Math.max(this.data.minStockLevel * 2 - this.data.currentStock, 10)
      : 50;

    this.refillForm.patchValue({
      requestedQuantity: suggestedQuantity
    });

    // Set priority based on current stock level
    if (this.data.currentStock === 0) {
      this.refillForm.patchValue({ priority: 'urgent' });
    } else if (this.data.minStockLevel && this.data.currentStock < this.data.minStockLevel) {
      this.refillForm.patchValue({ priority: 'high' });
    }
  }

  onReasonChange(): void {
    const reason = this.refillForm.get('reason')?.value;
    if (reason === 'Other') {
      this.refillForm.get('customReason')?.setValidators([Validators.required]);
    } else {
      this.refillForm.get('customReason')?.clearValidators();
    }
    this.refillForm.get('customReason')?.updateValueAndValidity();
  }

  onPriorityChange(): void {
    const priority = this.refillForm.get('priority')?.value;
    if (priority === 'urgent') {
      this.refillForm.get('urgentJustification')?.setValidators([Validators.required]);
    } else {
      this.refillForm.get('urgentJustification')?.clearValidators();
    }
    this.refillForm.get('urgentJustification')?.updateValueAndValidity();
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'low': return 'primary';
      case 'medium': return 'accent';
      case 'high': return 'warn';
      case 'urgent': return 'warn';
      default: return '';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'low': return 'schedule';
      case 'medium': return 'schedule';
      case 'high': return 'priority_high';
      case 'urgent': return 'emergency';
      default: return 'schedule';
    }
  }

  onSubmit(): void {
    if (this.refillForm.valid) {
      this.isSubmitting = true;

      const formValue = this.refillForm.value;
      const request: StockRefillRequest = {
        medicineId: this.data.medicineId,
        medicineName: this.data.medicineName,
        currentStock: this.data.currentStock,
        requestedQuantity: formValue.requestedQuantity,
        priority: formValue.priority,
        reason: formValue.reason === 'Other' ? formValue.customReason : formValue.reason,
        status: 'pending',
        requestedBy: 'current-pharmacist', // This should come from auth service
        requestedAt: new Date()
      };

      // Add notes if provided
      if (formValue.notes) {
        request.reason += ` - Notes: ${formValue.notes}`;
      }

      // Add urgent justification if provided
      if (formValue.urgentJustification) {
        request.reason += ` - Urgent Justification: ${formValue.urgentJustification}`;
      }

      this.pharmacistService.createStockRefillRequest(request)
        .subscribe({
          next: () => {
            this.snackBar.open('Stock refill request submitted successfully', 'Close', { duration: 3000 });
            this.dialogRef.close({ success: true, request });
            this.isSubmitting = false;
          },
          error: (error) => {
            console.error('Error submitting refill request:', error);
            this.snackBar.open('Error submitting refill request', 'Close', { duration: 3000 });
            this.isSubmitting = false;
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  markFormGroupTouched(): void {
    Object.keys(this.refillForm.controls).forEach(key => {
      const control = this.refillForm.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getEstimatedCost(): number {
    const quantity = this.refillForm.get('requestedQuantity')?.value || 0;
    // This is a rough estimate - actual cost would come from the backend
    return quantity * 10; // Assuming average cost of ₹10 per unit
  }
}