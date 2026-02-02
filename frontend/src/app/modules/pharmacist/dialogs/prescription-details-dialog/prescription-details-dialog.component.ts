import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PendingPrescription } from '../../services/pharmacist-prescription.service';

interface DialogData {
  prescription: PendingPrescription;
}

@Component({
  selector: 'app-prescription-details-dialog',
  templateUrl: './prescription-details-dialog.component.html',
  styleUrls: ['./prescription-details-dialog.component.scss']
})
export class PrescriptionDetailsDialogComponent implements OnInit {
  prescription: PendingPrescription;

  constructor(
    private dialogRef: MatDialogRef<PrescriptionDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private router: Router
  ) {
    this.prescription = data.prescription;
  }

  ngOnInit(): void {}

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'emergency':
        return 'warn';
      case 'urgent':
        return 'accent';
      case 'normal':
      default:
        return 'primary';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warn';
      case 'partially_dispensed':
        return 'accent';
      case 'ready_for_pickup':
        return 'primary';
      default:
        return 'primary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'partially_dispensed':
        return 'Partially Dispensed';
      case 'ready_for_pickup':
        return 'Ready for Pickup';
      default:
        return status;
    }
  }

  getMedicationStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warn';
      case 'dispensed':
        return 'primary';
      case 'out_of_stock':
        return 'warn';
      case 'substituted':
        return 'accent';
      default:
        return 'primary';
    }
  }

  getMedicationStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'dispensed':
        return 'Dispensed';
      case 'out_of_stock':
        return 'Out of Stock';
      case 'substituted':
        return 'Substituted';
      default:
        return status;
    }
  }

  canDispensePrescription(): boolean {
    return this.prescription.medications.some(med => 
      med.status === 'pending' && med.quantityRemaining > 0 && med.stockAvailable > 0
    );
  }

  getTotalEstimatedCost(): number {
    return this.prescription.medications.reduce((total, med) => total + med.totalPrice, 0);
  }

  getPendingMedicationsCount(): number {
    return this.prescription.medications.filter(med => med.status === 'pending').length;
  }

  goToDispense(): void {
    this.dialogRef.close('dispense');
    this.router.navigate(['/pharmacist/dispense-medicines'], {
      queryParams: { prescriptionId: this.prescription.id }
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}