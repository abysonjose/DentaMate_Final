import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { 
  CashierBillingService, 
  CompletedTreatment, 
  Invoice, 
  BillGenerationRequest 
} from '../../services/cashier-billing.service';

export interface InvoiceDialogData {
  treatment?: CompletedTreatment;
  invoice?: Invoice;
  mode: 'generate' | 'view';
}

@Component({
  selector: 'app-invoice-details-dialog',
  templateUrl: './invoice-details-dialog.component.html',
  styleUrls: ['./invoice-details-dialog.component.scss']
})
export class InvoiceDetailsDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  invoiceForm: FormGroup;
  isLoading = false;
  isGenerating = false;
  error: string | null = null;

  treatment?: CompletedTreatment;
  invoice?: Invoice;
  mode: 'generate' | 'view';

  previewData: {
    services: any[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
  } | null = null;

  constructor(
    private dialogRef: MatDialogRef<InvoiceDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InvoiceDialogData,
    private fb: FormBuilder,
    private billingService: CashierBillingService,
    private snackBar: MatSnackBar
  ) {
    this.treatment = data.treatment;
    this.invoice = data.invoice;
    this.mode = data.mode;

    this.invoiceForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.mode === 'generate' && this.treatment) {
      this.initializeFormForGeneration();
      this.generatePreview();
    } else if (this.mode === 'view' && this.invoice) {
      this.initializeFormForViewing();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      patientName: [{ value: '', disabled: true }],
      patientPhone: [{ value: '', disabled: true }],
      doctorName: [{ value: '', disabled: true }],
      treatmentDate: [{ value: '', disabled: true }],
      services: this.fb.array([]),
      notes: [''],
      dueDate: [new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), Validators.required] // 30 days from now
    });
  }

  private initializeFormForGeneration(): void {
    if (!this.treatment) return;

    this.invoiceForm.patchValue({
      patientName: this.treatment.patientName,
      patientPhone: this.treatment.patientPhone,
      doctorName: this.treatment.doctorName,
      treatmentDate: this.treatment.treatmentDate
    });

    const servicesArray = this.invoiceForm.get('services') as FormArray;
    this.treatment.services.forEach(service => {
      servicesArray.push(this.createServiceFormGroup(service));
    });
  }

  private initializeFormForViewing(): void {
    if (!this.invoice) return;

    this.invoiceForm.patchValue({
      patientName: this.invoice.patientName,
      patientPhone: this.invoice.patientPhone,
      doctorName: this.invoice.doctorName,
      treatmentDate: this.invoice.invoiceDate,
      notes: this.invoice.notes,
      dueDate: this.invoice.dueDate
    });

    const servicesArray = this.invoiceForm.get('services') as FormArray;
    this.invoice.services.forEach(service => {
      servicesArray.push(this.createInvoiceServiceFormGroup(service));
    });

    // Disable all form controls for view mode
    this.invoiceForm.disable();
  }

  private createServiceFormGroup(service: any): FormGroup {
    return this.fb.group({
      id: [service.id],
      serviceName: [{ value: service.serviceName, disabled: true }],
      description: [{ value: service.description, disabled: true }],
      quantity: [service.quantity, [Validators.required, Validators.min(1)]],
      unitPrice: [{ value: service.unitPrice, disabled: true }],
      discount: [service.discount || 0, [Validators.min(0)]],
      discountType: ['fixed'],
      totalPrice: [{ value: service.finalPrice, disabled: true }]
    });
  }

  private createInvoiceServiceFormGroup(service: any): FormGroup {
    return this.fb.group({
      id: [{ value: service.id, disabled: true }],
      serviceName: [{ value: service.serviceName, disabled: true }],
      description: [{ value: service.description, disabled: true }],
      quantity: [{ value: service.quantity, disabled: true }],
      unitPrice: [{ value: service.unitPrice, disabled: true }],
      discount: [{ value: service.discount, disabled: true }],
      discountType: [{ value: service.discountType, disabled: true }],
      totalPrice: [{ value: service.totalAmount, disabled: true }]
    });
  }

  get servicesArray(): FormArray {
    return this.invoiceForm.get('services') as FormArray;
  }

  onServiceChange(): void {
    if (this.mode === 'generate') {
      this.generatePreview();
    }
  }

  private generatePreview(): void {
    if (!this.treatment || this.mode !== 'generate') return;

    const request: BillGenerationRequest = {
      treatmentId: this.treatment.id,
      patientId: this.treatment.patientId,
      services: this.servicesArray.value.map((service: any) => ({
        serviceId: service.id,
        quantity: service.quantity,
        discount: service.discount,
        discountType: service.discountType
      })),
      notes: this.invoiceForm.get('notes')?.value,
      dueDate: this.invoiceForm.get('dueDate')?.value
    };

    this.billingService.previewInvoice(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (preview) => {
          this.previewData = preview;
        },
        error: (error) => {
          console.error('Error generating preview:', error);
          // Fallback to manual calculation
          this.calculatePreview();
        }
      });
  }

  private calculatePreview(): void {
    const services = this.servicesArray.value;
    let subtotal = 0;
    let discountAmount = 0;

    services.forEach((service: any) => {
      const serviceTotal = service.quantity * service.unitPrice;
      subtotal += serviceTotal;
      
      if (service.discountType === 'percentage') {
        discountAmount += (serviceTotal * service.discount) / 100;
      } else {
        discountAmount += service.discount;
      }
    });

    const taxAmount = (subtotal - discountAmount) * 0.18; // 18% GST
    const totalAmount = subtotal - discountAmount + taxAmount;

    this.previewData = {
      services: services,
      subtotal: subtotal,
      discountAmount: discountAmount,
      taxAmount: taxAmount,
      totalAmount: totalAmount
    };
  }

  generateBill(): void {
    if (!this.treatment || this.invoiceForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.isGenerating = true;
    this.error = null;

    const request: BillGenerationRequest = {
      treatmentId: this.treatment.id,
      patientId: this.treatment.patientId,
      services: this.servicesArray.value.map((service: any) => ({
        serviceId: service.id,
        quantity: service.quantity,
        discount: service.discount,
        discountType: service.discountType
      })),
      notes: this.invoiceForm.get('notes')?.value,
      dueDate: this.invoiceForm.get('dueDate')?.value
    };

    this.billingService.generateBill(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invoice) => {
          this.isGenerating = false;
          this.snackBar.open('Bill generated successfully', 'Close', { duration: 3000 });
          this.dialogRef.close('generated');
        },
        error: (error) => {
          console.error('Error generating bill:', error);
          this.error = 'Failed to generate bill. Please try again.';
          this.isGenerating = false;
        }
      });
  }

  downloadInvoice(): void {
    if (!this.invoice) return;

    this.billingService.generateInvoicePDF(this.invoice.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${this.invoice!.invoiceNumber}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error downloading invoice:', error);
          this.snackBar.open('Failed to download invoice', 'Close', { duration: 3000 });
        }
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  getTitle(): string {
    if (this.mode === 'generate') {
      return 'Generate Bill';
    } else if (this.invoice) {
      return `Invoice ${this.invoice.invoiceNumber}`;
    }
    return 'Invoice Details';
  }

  canGenerateBill(): boolean {
    return this.mode === 'generate' && 
           this.invoiceForm.valid && 
           !this.isGenerating;
  }

  canDownloadInvoice(): boolean {
    return this.mode === 'view' && !!this.invoice;
  }

  getPaymentStatusColor(status: string): string {
    switch (status) {
      case 'paid':
        return 'primary';
      case 'partial':
        return 'accent';
      case 'unpaid':
        return 'warn';
      case 'refunded':
        return 'primary';
      default:
        return 'primary';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'generated':
        return 'primary';
      case 'sent':
        return 'accent';
      case 'overdue':
        return 'warn';
      case 'cancelled':
        return 'warn';
      case 'draft':
        return 'primary';
      default:
        return 'primary';
    }
  }
}