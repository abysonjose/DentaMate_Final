import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PharmacistService, Prescription } from '../../services/pharmacist.service';
import { PharmacistBillingIntegrationService } from '../../../../shared/services/pharmacist-billing-integration.service';
import { PharmacistCashierIntegrationService } from '../../../../shared/services/pharmacist-cashier-integration.service';

@Component({
  selector: 'app-prescription-details-dialog',
  templateUrl: './prescription-details-dialog.component.html',
  styleUrls: ['./prescription-details-dialog.component.scss']
})
export class PrescriptionDetailsDialogComponent implements OnInit {
  prescription: Prescription;
  isLoading = false;
  paymentVerified = false;
  cashierAvailable = false;
  paymentQueuePosition: number | null = null;
  billingInfo: any = null;
  receiptInfo: any = null;

  constructor(
    public dialogRef: MatDialogRef<PrescriptionDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { prescription: Prescription },
    private pharmacistService: PharmacistService,
    private billingIntegration: PharmacistBillingIntegrationService,
    private cashierIntegration: PharmacistCashierIntegrationService,
    private snackBar: MatSnackBar
  ) {
    this.prescription = data.prescription;
  }

  ngOnInit(): void {
    this.checkPaymentStatus();
    this.checkCashierAvailability();
    this.loadBillingInfo();
  }

  checkPaymentStatus(): void {
    this.pharmacistService.verifyPaymentStatus(this.prescription.id)
      .subscribe({
        next: (paymentInfo) => {
          this.paymentVerified = paymentInfo.status === 'paid';
          if (this.paymentVerified && this.prescription.paymentStatus !== 'paid') {
            this.prescription.paymentStatus = 'paid';
          }
        },
        error: (error) => {
          console.error('Error checking payment status:', error);
        }
      });
  }

  checkCashierAvailability(): void {
    this.cashierIntegration.checkCashierAvailability()
      .subscribe({
        next: (availability) => {
          this.cashierAvailable = availability.available;
        },
        error: (error) => {
          console.error('Error checking cashier availability:', error);
        }
      });
  }

  loadBillingInfo(): void {
    this.billingIntegration.getInvoiceForPrescription(this.prescription.id)
      .subscribe({
        next: (billingInfo) => {
          this.billingInfo = billingInfo;
        },
        error: (error) => {
          console.error('Error loading billing info:', error);
        }
      });
  }

  verifyPrescription(): void {
    if (!this.paymentVerified) {
      this.snackBar.open('Payment must be confirmed before verification', 'Close', { duration: 4000 });
      return;
    }

    if (!this.prescription.isAuthentic) {
      this.snackBar.open('Prescription authenticity must be verified first', 'Close', { duration: 4000 });
      return;
    }

    this.isLoading = true;
    this.pharmacistService.verifyPrescription(this.prescription.id)
      .subscribe({
        next: () => {
          this.prescription.status = 'verified';
          this.snackBar.open('Prescription verified successfully', 'Close', { duration: 3000 });
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error verifying prescription:', error);
          this.snackBar.open('Error verifying prescription', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  dispensePrescription(): void {
    if (this.prescription.status !== 'verified') {
      this.snackBar.open('Prescription must be verified before dispensing', 'Close', { duration: 4000 });
      return;
    }

    // Close dialog and return action for parent component to handle dispensing
    this.dialogRef.close({ action: 'dispense', prescription: this.prescription });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'warn';
      case 'verified': return 'primary';
      case 'dispensed': return 'accent';
      case 'cancelled': return '';
      default: return '';
    }
  }

  getPaymentStatusColor(status: string): string {
    switch (status) {
      case 'paid': return 'accent';
      case 'pending': return 'warn';
      case 'failed': return 'warn';
      default: return '';
    }
  }

  canVerify(): boolean {
    return this.prescription.status === 'pending' && 
           this.paymentVerified && 
           this.prescription.isAuthentic;
  }

  canDispense(): boolean {
    return this.prescription.status === 'verified' && 
           this.paymentVerified;
  }

  getTotalMedicines(): number {
    return this.prescription.medicines.reduce((total, medicine) => total + medicine.quantity, 0);
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.dialogRef.close({ 
      action: this.prescription.status, 
      prescription: this.prescription 
    });
  }

  // New Integration Methods
  requestPaymentFromCashier(): void {
    if (!this.cashierAvailable) {
      this.snackBar.open('Cashier is not available at the moment', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.pharmacistService.requestPaymentFromCashier(
      this.prescription.id,
      this.prescription.patientId,
      this.prescription.patientName,
      this.prescription.medicines
    ).subscribe({
      next: (response) => {
        this.snackBar.open('Payment request sent to cashier', 'Close', { duration: 3000 });
        this.checkPaymentQueuePosition();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error requesting payment from cashier:', error);
        this.snackBar.open('Error sending payment request', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  checkPaymentQueuePosition(): void {
    this.pharmacistService.getPaymentQueuePosition(this.prescription.id)
      .subscribe({
        next: (position) => {
          this.paymentQueuePosition = position.position;
        },
        error: (error) => {
          console.error('Error checking queue position:', error);
        }
      });
  }

  refreshPaymentStatus(): void {
    this.isLoading = true;
    this.pharmacistService.refreshPaymentStatus(this.prescription.id)
      .subscribe({
        next: (paymentInfo) => {
          this.paymentVerified = paymentInfo.status === 'paid';
          this.prescription.paymentStatus = paymentInfo.status;
          this.snackBar.open('Payment status refreshed', 'Close', { duration: 2000 });
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error refreshing payment status:', error);
          this.snackBar.open('Error refreshing payment status', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  requestUrgentPayment(): void {
    const message = `Urgent payment required for prescription ${this.prescription.id} - Patient: ${this.prescription.patientName}`;
    
    this.pharmacistService.requestUrgentPayment(this.prescription.id, message)
      .subscribe({
        next: () => {
          this.snackBar.open('Urgent payment notification sent to cashier', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error sending urgent notification:', error);
          this.snackBar.open('Error sending urgent notification', 'Close', { duration: 3000 });
        }
      });
  }

  viewBillingDetails(): void {
    if (this.billingInfo) {
      // Open billing details in a new dialog or expand current view
      console.log('Billing details:', this.billingInfo);
    } else {
      this.snackBar.open('No billing information available', 'Close', { duration: 2000 });
    }
  }

  generateReceipt(): void {
    this.pharmacistService.getReceiptForPrescription(this.prescription.id)
      .subscribe({
        next: (receipt) => {
          this.receiptInfo = receipt;
          this.snackBar.open('Receipt generated successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error generating receipt:', error);
          this.snackBar.open('Error generating receipt', 'Close', { duration: 3000 });
        }
      });
  }

  getQueuePositionText(): string {
    if (this.paymentQueuePosition === null) return '';
    if (this.paymentQueuePosition === 1) return 'Next in queue';
    return `Position ${this.paymentQueuePosition} in queue`;
  }
}