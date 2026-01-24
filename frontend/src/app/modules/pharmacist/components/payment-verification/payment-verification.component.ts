import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PharmacistService } from '../../services/pharmacist.service';

@Component({
  selector: 'app-payment-verification',
  templateUrl: './payment-verification.component.html',
  styleUrls: ['./payment-verification.component.scss']
})
export class PaymentVerificationComponent implements OnInit {
  paymentInfo: any = null;
  isLoading = true;
  isVerifying = false;

  constructor(
    public dialogRef: MatDialogRef<PaymentVerificationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { prescriptionId: string },
    private pharmacistService: PharmacistService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPaymentStatus();
  }

  loadPaymentStatus(): void {
    this.isLoading = true;
    
    this.pharmacistService.verifyPaymentStatus(this.data.prescriptionId)
      .subscribe({
        next: (paymentInfo) => {
          this.paymentInfo = paymentInfo;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading payment status:', error);
          this.snackBar.open('Error loading payment status', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  refreshPaymentStatus(): void {
    this.loadPaymentStatus();
  }

  getPaymentStatusColor(status: string): string {
    switch (status) {
      case 'paid': return 'accent';
      case 'pending': return 'warn';
      case 'failed': return 'warn';
      default: return '';
    }
  }

  getPaymentStatusIcon(status: string): string {
    switch (status) {
      case 'paid': return 'check_circle';
      case 'pending': return 'schedule';
      case 'failed': return 'error';
      default: return 'help';
    }
  }

  onClose(): void {
    this.dialogRef.close({ updated: false });
  }

  onConfirm(): void {
    this.dialogRef.close({ 
      updated: true, 
      paymentStatus: this.paymentInfo?.status 
    });
  }
}