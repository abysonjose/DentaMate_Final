import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PendingPrescription, DispenseRequest } from '../../services/pharmacist-prescription.service';

interface DialogData {
  prescription: PendingPrescription;
  dispenseRequest: DispenseRequest;
}

@Component({
  selector: 'app-dispense-confirmation-dialog',
  templateUrl: './dispense-confirmation-dialog.component.html',
  styleUrls: ['./dispense-confirmation-dialog.component.scss']
})
export class DispenseConfirmationDialogComponent implements OnInit {
  prescription: PendingPrescription;
  dispenseRequest: DispenseRequest;

  constructor(
    private dialogRef: MatDialogRef<DispenseConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.prescription = data.prescription;
    this.dispenseRequest = data.dispenseRequest;
  }

  ngOnInit(): void {}

  getTotalItemsToDispense(): number {
    return this.dispenseRequest.medications.reduce((total, med) => total + med.quantityToDispense, 0);
  }

  getMedicationName(medicationId: string): string {
    const medication = this.prescription.medications.find(m => m.medicationId === medicationId);
    return medication?.medicationName || 'Unknown Medication';
  }

  getMedicationDetails(medicationId: string) {
    return this.prescription.medications.find(m => m.medicationId === medicationId);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}