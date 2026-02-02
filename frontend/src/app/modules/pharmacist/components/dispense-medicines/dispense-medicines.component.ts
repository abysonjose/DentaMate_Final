import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { 
  PharmacistPrescriptionService, 
  PendingPrescription, 
  PrescriptionMedication,
  DispenseRequest 
} from '../../services/pharmacist-prescription.service';
import { DispenseConfirmationDialogComponent } from '../../dialogs/dispense-confirmation-dialog/dispense-confirmation-dialog.component';

@Component({
  selector: 'app-dispense-medicines',
  templateUrl: './dispense-medicines.component.html',
  styleUrls: ['./dispense-medicines.component.scss']
})
export class DispenseMedicinesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  selectedPrescription: PendingPrescription | null = null;
  prescriptionSearchResults: PendingPrescription[] = [];
  isSearching = false;
  isDispensing = false;

  dispenseForm: FormGroup;
  searchForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private prescriptionService: PharmacistPrescriptionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.searchForm = this.fb.group({
      searchQuery: ['', Validators.required]
    });

    this.dispenseForm = this.fb.group({
      patientVerified: [false, Validators.requiredTrue],
      counselingProvided: [false, Validators.requiredTrue],
      notes: [''],
      medications: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchForm.get('searchQuery')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        if (query && query.length >= 2) {
          this.searchPrescriptions(query);
        } else {
          this.prescriptionSearchResults = [];
        }
      });
  }

  private searchPrescriptions(query: string): void {
    this.isSearching = true;
    
    this.prescriptionService.searchPrescriptions(query, { status: 'pending' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.prescriptionSearchResults = results;
          this.isSearching = false;
        },
        error: (error) => {
          console.error('Error searching prescriptions:', error);
          this.snackBar.open('Error searching prescriptions', 'Close', { duration: 3000 });
          this.isSearching = false;
        }
      });
  }

  selectPrescription(prescription: PendingPrescription): void {
    this.selectedPrescription = prescription;
    this.prescriptionSearchResults = [];
    this.searchForm.get('searchQuery')?.setValue(prescription.prescriptionNumber);
    this.setupDispenseForm();
  }

  private setupDispenseForm(): void {
    if (!this.selectedPrescription) return;

    const medicationsArray = this.fb.array([]);
    
    this.selectedPrescription.medications.forEach(medication => {
      if (medication.status === 'pending' && medication.quantityRemaining > 0) {
        medicationsArray.push(this.createMedicationFormGroup(medication));
      }
    });

    this.dispenseForm.setControl('medications', medicationsArray);
    this.dispenseForm.patchValue({
      patientVerified: false,
      counselingProvided: false,
      notes: ''
    });
  }

  private createMedicationFormGroup(medication: PrescriptionMedication): FormGroup {
    return this.fb.group({
      medicationId: [medication.medicationId],
      medicationName: [medication.medicationName],
      quantityPrescribed: [medication.quantity],
      quantityRemaining: [medication.quantityRemaining],
      quantityToDispense: [
        medication.quantityRemaining, 
        [Validators.required, Validators.min(1), Validators.max(medication.quantityRemaining)]
      ],
      stockAvailable: [medication.stockAvailable],
      batchNumber: [''],
      substitutedWith: [''],
      notes: [''],
      canDispense: [medication.stockAvailable >= medication.quantityRemaining]
    });
  }

  get medicationsFormArray(): FormArray {
    return this.dispenseForm.get('medications') as FormArray;
  }

  getMedicationFormGroup(index: number): FormGroup {
    return this.medicationsFormArray.at(index) as FormGroup;
  }

  checkStockAvailability(): void {
    if (!this.selectedPrescription) return;

    const medicationIds = this.selectedPrescription.medications
      .filter(m => m.status === 'pending')
      .map(m => m.medicationId);

    this.prescriptionService.checkStockAvailability(medicationIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stockInfo) => {
          this.updateStockInformation(stockInfo);
        },
        error: (error) => {
          console.error('Error checking stock:', error);
          this.snackBar.open('Error checking stock availability', 'Close', { duration: 3000 });
        }
      });
  }

  private updateStockInformation(stockInfo: any[]): void {
    this.medicationsFormArray.controls.forEach((control, index) => {
      const medicationId = control.get('medicationId')?.value;
      const stock = stockInfo.find(s => s.medicationId === medicationId);
      
      if (stock) {
        control.patchValue({
          stockAvailable: stock.availableStock,
          canDispense: stock.available
        });

        // Update quantity to dispense if stock is insufficient
        const quantityToDispense = control.get('quantityToDispense')?.value;
        if (quantityToDispense > stock.availableStock) {
          control.patchValue({
            quantityToDispense: stock.availableStock
          });
        }
      }
    });
  }

  onQuantityChange(index: number): void {
    const medicationControl = this.getMedicationFormGroup(index);
    const quantityToDispense = medicationControl.get('quantityToDispense')?.value;
    const stockAvailable = medicationControl.get('stockAvailable')?.value;
    const quantityRemaining = medicationControl.get('quantityRemaining')?.value;

    // Validate quantity
    if (quantityToDispense > stockAvailable) {
      medicationControl.patchValue({ quantityToDispense: stockAvailable });
      this.snackBar.open('Quantity adjusted to available stock', 'Close', { duration: 2000 });
    }

    if (quantityToDispense > quantityRemaining) {
      medicationControl.patchValue({ quantityToDispense: quantityRemaining });
      this.snackBar.open('Quantity adjusted to prescribed amount', 'Close', { duration: 2000 });
    }
  }

  canDispenseAll(): boolean {
    return this.medicationsFormArray.controls.every(control => 
      control.get('canDispense')?.value === true
    );
  }

  getTotalItemsToDispense(): number {
    return this.medicationsFormArray.controls.reduce((total, control) => {
      return total + (control.get('quantityToDispense')?.value || 0);
    }, 0);
  }

  dispenseMedicines(): void {
    if (!this.selectedPrescription || !this.dispenseForm.valid) {
      this.snackBar.open('Please complete all required fields', 'Close', { duration: 3000 });
      return;
    }

    const dispenseRequest: DispenseRequest = {
      prescriptionId: this.selectedPrescription.id,
      medications: this.medicationsFormArray.controls.map(control => ({
        medicationId: control.get('medicationId')?.value,
        quantityToDispense: control.get('quantityToDispense')?.value,
        batchNumber: control.get('batchNumber')?.value,
        substitutedWith: control.get('substitutedWith')?.value,
        notes: control.get('notes')?.value
      })),
      patientVerified: this.dispenseForm.get('patientVerified')?.value,
      counselingProvided: this.dispenseForm.get('counselingProvided')?.value,
      notes: this.dispenseForm.get('notes')?.value
    };

    // Show confirmation dialog
    const dialogRef = this.dialog.open(DispenseConfirmationDialogComponent, {
      width: '600px',
      data: {
        prescription: this.selectedPrescription,
        dispenseRequest: dispenseRequest
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.performDispense(dispenseRequest);
      }
    });
  }

  private performDispense(dispenseRequest: DispenseRequest): void {
    this.isDispensing = true;

    this.prescriptionService.dispenseMedicines(dispenseRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.snackBar.open('Medicines dispensed successfully', 'Close', { duration: 3000 });
          this.resetForm();
          this.isDispensing = false;
        },
        error: (error) => {
          console.error('Error dispensing medicines:', error);
          this.snackBar.open('Error dispensing medicines. Please try again.', 'Close', { duration: 5000 });
          this.isDispensing = false;
        }
      });
  }

  resetForm(): void {
    this.selectedPrescription = null;
    this.prescriptionSearchResults = [];
    this.searchForm.reset();
    this.dispenseForm.reset();
    this.dispenseForm.setControl('medications', this.fb.array([]));
  }

  getStockStatusColor(stockAvailable: number, quantityNeeded: number): string {
    if (stockAvailable >= quantityNeeded) {
      return 'primary';
    } else if (stockAvailable > 0) {
      return 'accent';
    } else {
      return 'warn';
    }
  }

  getStockStatusText(stockAvailable: number, quantityNeeded: number): string {
    if (stockAvailable >= quantityNeeded) {
      return 'In Stock';
    } else if (stockAvailable > 0) {
      return 'Partial Stock';
    } else {
      return 'Out of Stock';
    }
  }
}