import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { 
  BillGenerationService, 
  AppointmentDetails, 
  BillableItem, 
  BillGenerationRequest,
  TaxConfiguration 
} from '../../services/bill-generation.service';

@Component({
  selector: 'app-generate-bill-dialog',
  templateUrl: './generate-bill-dialog.component.html',
  styleUrls: ['./generate-bill-dialog.component.scss']
})
export class GenerateBillDialogComponent implements OnInit {
  billForm: FormGroup;
  loading = false;
  saving = false;
  
  // Data
  appointments: AppointmentDetails[] = [];
  selectedAppointment: AppointmentDetails | null = null;
  standardItems: BillableItem[] = [];
  taxConfig: TaxConfiguration | null = null;
  
  // Calculations
  subtotal = 0;
  taxAmount = 0;
  totalAmount = 0;
  
  // UI State
  showItemSearch = false;
  itemSearchTerm = '';
  searchResults: BillableItem[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<GenerateBillDialogComponent>,
    private billService: BillGenerationService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFormSubscriptions();
  }

  private initializeForm(): void {
    this.billForm = this.fb.group({
      appointmentId: ['', Validators.required],
      patientId: [''],
      patientName: [''],
      billableItems: this.fb.array([]),
      notes: [''],
      dueDate: [new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), Validators.required] // 7 days from now
    });
  }

  private setupFormSubscriptions(): void {
    // Watch for appointment selection changes
    this.billForm.get('appointmentId')?.valueChanges.subscribe(appointmentId => {
      if (appointmentId) {
        this.onAppointmentSelected(appointmentId);
      }
    });

    // Watch for billable items changes to recalculate totals
    this.billableItemsArray.valueChanges.subscribe(() => {
      this.calculateTotals();
    });
  }

  private loadInitialData(): void {
    this.loading = true;

    // Load completed appointments
    this.billService.getCompletedAppointments().subscribe({
      next: (appointments) => {
        this.appointments = appointments.filter(apt => apt.status === 'COMPLETED');
      },
      error: (error) => {
        console.error('Error loading appointments:', error);
        this.showError('Failed to load appointments');
      }
    });

    // Load standard billable items
    this.billService.getStandardBillableItems().subscribe({
      next: (items) => {
        this.standardItems = items;
      },
      error: (error) => {
        console.error('Error loading standard items:', error);
      }
    });

    // Load tax configuration
    this.billService.getTaxConfiguration().subscribe({
      next: (config) => {
        this.taxConfig = config;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tax config:', error);
        this.loading = false;
      }
    });
  }

  get billableItemsArray(): FormArray {
    return this.billForm.get('billableItems') as FormArray;
  }

  onAppointmentSelected(appointmentId: string): void {
    const appointment = this.appointments.find(apt => apt.appointmentId === appointmentId);
    if (appointment) {
      this.selectedAppointment = appointment;
      this.billForm.patchValue({
        patientId: appointment.patientId,
        patientName: appointment.patientName
      });

      // Load appointment-specific billable items
      this.billService.getAppointmentBillableItems(appointmentId).subscribe({
        next: (items) => {
          this.clearBillableItems();
          items.forEach(item => this.addBillableItem(item));
        },
        error: (error) => {
          console.error('Error loading appointment items:', error);
          // Add default consultation fee
          this.addDefaultConsultationFee();
        }
      });
    }
  }

  private addDefaultConsultationFee(): void {
    if (this.selectedAppointment) {
      const consultationItem: BillableItem = {
        id: 'consultation',
        name: 'Consultation Fee',
        description: `Consultation with ${this.selectedAppointment.doctorName}`,
        unitPrice: this.selectedAppointment.consultationFee,
        quantity: 1,
        total: this.selectedAppointment.consultationFee,
        category: 'CONSULTATION',
        taxable: true
      };
      this.addBillableItem(consultationItem);
    }
  }

  addBillableItem(item?: BillableItem): void {
    const itemForm = this.fb.group({
      id: [item?.id || ''],
      name: [item?.name || '', Validators.required],
      description: [item?.description || ''],
      unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0.01)]],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
      total: [item?.total || 0],
      category: [item?.category || 'OTHER', Validators.required],
      taxable: [item?.taxable !== false]
    });

    // Calculate total when unit price or quantity changes
    itemForm.get('unitPrice')?.valueChanges.subscribe(() => this.updateItemTotal(itemForm));
    itemForm.get('quantity')?.valueChanges.subscribe(() => this.updateItemTotal(itemForm));

    this.billableItemsArray.push(itemForm);
    this.updateItemTotal(itemForm);
  }

  removeBillableItem(index: number): void {
    this.billableItemsArray.removeAt(index);
    this.calculateTotals();
  }

  private updateItemTotal(itemForm: FormGroup): void {
    const unitPrice = itemForm.get('unitPrice')?.value || 0;
    const quantity = itemForm.get('quantity')?.value || 0;
    const total = unitPrice * quantity;
    itemForm.get('total')?.setValue(total, { emitEvent: false });
    this.calculateTotals();
  }

  private clearBillableItems(): void {
    while (this.billableItemsArray.length !== 0) {
      this.billableItemsArray.removeAt(0);
    }
  }

  private calculateTotals(): void {
    const items = this.billableItemsArray.value as BillableItem[];
    this.subtotal = this.billService.calculateSubtotal(items);
    
    if (this.taxConfig) {
      const taxableAmount = items
        .filter(item => item.taxable)
        .reduce((sum, item) => sum + item.total, 0);
      
      this.taxAmount = taxableAmount * (this.taxConfig.gstRate / 100);
    }
    
    this.totalAmount = this.subtotal + this.taxAmount;
  }

  // Item Search
  searchItems(): void {
    if (this.itemSearchTerm.trim().length < 2) {
      this.searchResults = [];
      return;
    }

    this.billService.searchBillableItems(this.itemSearchTerm).subscribe({
      next: (results) => {
        this.searchResults = results;
      },
      error: (error) => {
        console.error('Error searching items:', error);
      }
    });
  }

  addSearchedItem(item: BillableItem): void {
    this.addBillableItem(item);
    this.showItemSearch = false;
    this.itemSearchTerm = '';
    this.searchResults = [];
  }

  // Form Actions
  saveDraft(): void {
    if (this.billForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const billRequest = this.prepareBillRequest();

    this.billService.saveBillDraft(billRequest).subscribe({
      next: (bill) => {
        this.showSuccess('Bill draft saved successfully');
        this.dialogRef.close({ action: 'draft', bill });
      },
      error: (error) => {
        console.error('Error saving draft:', error);
        this.showError('Failed to save bill draft');
        this.saving = false;
      }
    });
  }

  generateBill(): void {
    if (this.billForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    // Validate bill
    const billRequest = this.prepareBillRequest();
    const validationErrors = this.billService.validateBillRequest(billRequest);
    
    if (validationErrors.length > 0) {
      this.showError(validationErrors[0]);
      return;
    }

    this.saving = true;

    this.billService.generateBill(billRequest).subscribe({
      next: (bill) => {
        this.showSuccess('Bill generated successfully');
        this.dialogRef.close({ action: 'generate', bill });
      },
      error: (error) => {
        console.error('Error generating bill:', error);
        this.showError('Failed to generate bill');
        this.saving = false;
      }
    });
  }

  private prepareBillRequest(): BillGenerationRequest {
    const formValue = this.billForm.value;
    return {
      appointmentId: formValue.appointmentId,
      patientId: formValue.patientId,
      billableItems: formValue.billableItems,
      subtotal: this.subtotal,
      taxAmount: this.taxAmount,
      totalAmount: this.totalAmount,
      notes: formValue.notes,
      dueDate: formValue.dueDate
    };
  }

  private markFormGroupTouched(): void {
    Object.keys(this.billForm.controls).forEach(key => {
      const control = this.billForm.get(key);
      control?.markAsTouched();
    });

    this.billableItemsArray.controls.forEach(control => {
      Object.keys(control.value).forEach(key => {
        control.get(key)?.markAsTouched();
      });
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  // Utility Methods
  formatCurrency(amount: number): string {
    return this.billService.formatCurrency(amount);
  }

  getCategoryDisplayName(category: string): string {
    return this.billService.getCategoryDisplayName(category);
  }

  getCategoryColor(category: string): string {
    return this.billService.getCategoryColor(category);
  }

  // Snackbar Messages
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}