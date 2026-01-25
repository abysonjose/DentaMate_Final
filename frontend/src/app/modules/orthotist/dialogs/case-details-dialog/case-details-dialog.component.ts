import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrthotistService, OrthodonticCase, CaseMeasurement, FabricationStage } from '../../services/orthotist.service';

@Component({
  selector: 'app-case-details-dialog',
  templateUrl: './case-details-dialog.component.html',
  styleUrls: ['./case-details-dialog.component.scss']
})
export class CaseDetailsDialogComponent implements OnInit {
  case: OrthodonticCase;
  measurements: CaseMeasurement | null = null;
  fabricationStages: FabricationStage[] = [];
  
  statusUpdateForm: FormGroup;
  deliveryForm: FormGroup;
  
  loading = false;
  activeTab = 0;
  
  statusOptions = [
    { value: 'RECEIVED', label: 'Received' },
    { value: 'IN_MEASUREMENT_REVIEW', label: 'In Measurement Review' },
    { value: 'IN_FABRICATION', label: 'In Fabrication' },
    { value: 'READY', label: 'Ready' },
    { value: 'DELIVERED', label: 'Delivered' }
  ];

  constructor(
    public dialogRef: MatDialogRef<CaseDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private orthotistService: OrthotistService
  ) {
    this.case = data.case;
    
    this.statusUpdateForm = this.fb.group({
      status: [this.case.status, Validators.required],
      notes: ['']
    });
    
    this.deliveryForm = this.fb.group({
      estimatedDeliveryDate: [this.case.estimatedDeliveryDate || '', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCaseDetails();
  }

  loadCaseDetails(): void {
    this.loading = true;
    
    // Load measurements
    this.orthotistService.getMeasurements(this.case.id).subscribe({
      next: (measurements) => {
        this.measurements = measurements;
      },
      error: (error) => console.error('Error loading measurements:', error)
    });
    
    // Load fabrication stages
    this.orthotistService.getFabricationStages(this.case.id).subscribe({
      next: (stages) => {
        this.fabricationStages = stages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading fabrication stages:', error);
        this.loading = false;
      }
    });
  }

  updateStatus(): void {
    if (this.statusUpdateForm.valid) {
      const formData = this.statusUpdateForm.value;
      
      this.orthotistService.updateCaseStatus(this.case.id, formData.status).subscribe({
        next: () => {
          this.case.status = formData.status;
          // Add note if provided
          if (formData.notes) {
            // Add note logic here
          }
        },
        error: (error) => console.error('Error updating status:', error)
      });
    }
  }

  updateDeliveryDate(): void {
    if (this.deliveryForm.valid) {
      const deliveryDate = this.deliveryForm.value.estimatedDeliveryDate;
      
      this.orthotistService.setDeliveryDate(this.case.id, deliveryDate).subscribe({
        next: () => {
          this.case.estimatedDeliveryDate = deliveryDate;
        },
        error: (error) => console.error('Error updating delivery date:', error)
      });
    }
  }

  markAsReady(): void {
    this.orthotistService.markAsReady(this.case.id).subscribe({
      next: () => {
        this.case.status = 'READY';
        this.statusUpdateForm.patchValue({ status: 'READY' });
      },
      error: (error) => console.error('Error marking as ready:', error)
    });
  }

  confirmMeasurements(): void {
    this.orthotistService.confirmMeasurementReceipt(this.case.id).subscribe({
      next: () => {
        if (this.measurements) {
          this.measurements.reviewedBy = 'Current Orthotist';
          this.measurements.reviewedAt = new Date();
        }
      },
      error: (error) => console.error('Error confirming measurements:', error)
    });
  }

  requestClarification(): void {
    // This would open another dialog for clarification request
    console.log('Request clarification');
  }

  getStatusColor(status: string): string {
    return this.orthotistService.getCaseStatusColor(status);
  }

  getPriorityColor(priority: string): string {
    return this.orthotistService.getPriorityColor(priority);
  }

  getStageStatusColor(status: string): string {
    const colors = {
      'PENDING': '#757575',
      'IN_PROGRESS': '#2196F3',
      'COMPLETED': '#4CAF50',
      'ON_HOLD': '#FF9800'
    };
    return colors[status] || '#757575';
  }

  isOverdue(): boolean {
    if (!this.case.estimatedDeliveryDate) return false;
    return new Date(this.case.estimatedDeliveryDate) < new Date();
  }

  canUpdateStatus(newStatus: string): boolean {
    const currentStatus = this.case.status;
    const statusFlow = {
      'RECEIVED': ['IN_MEASUREMENT_REVIEW'],
      'IN_MEASUREMENT_REVIEW': ['IN_FABRICATION'],
      'IN_FABRICATION': ['READY'],
      'READY': ['DELIVERED'],
      'DELIVERED': []
    };
    
    return statusFlow[currentStatus]?.includes(newStatus) || false;
  }

  onClose(): void {
    this.dialogRef.close({ updated: true });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}