import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { PharmacistService, Prescription } from '../../services/pharmacist.service';
import { PrescriptionDetailsDialogComponent } from '../../dialogs/prescription-details-dialog/prescription-details-dialog.component';
import { PaymentVerificationComponent } from '../payment-verification/payment-verification.component';

@Component({
  selector: 'app-prescription-verification',
  templateUrl: './prescription-verification.component.html',
  styleUrls: ['./prescription-verification.component.scss']
})
export class PrescriptionVerificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  displayedColumns: string[] = [
    'patientName',
    'doctorName',
    'prescriptionDate',
    'medicineCount',
    'totalAmount',
    'paymentStatus',
    'status',
    'actions'
  ];

  dataSource = new MatTableDataSource<Prescription>();
  searchControl = new FormControl('');
  statusFilter = new FormControl('all');
  paymentFilter = new FormControl('all');
  
  isLoading = false;
  totalPrescriptions = 0;

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'dispensed', label: 'Dispensed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  paymentOptions = [
    { value: 'all', label: 'All Payments' },
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' }
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private pharmacistService: PharmacistService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setupDataSource();
    this.setupFilters();
    this.loadPrescriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupDataSource(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Custom filter predicate
    this.dataSource.filterPredicate = (data: Prescription, filter: string) => {
      const searchTerm = filter.toLowerCase();
      return data.patientName.toLowerCase().includes(searchTerm) ||
             data.doctorName.toLowerCase().includes(searchTerm) ||
             data.id.toLowerCase().includes(searchTerm);
    };
  }

  setupFilters(): void {
    // Search filter
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        this.dataSource.filter = value?.trim().toLowerCase() || '';
      });

    // Status filter
    this.statusFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });

    // Payment filter
    this.paymentFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  loadPrescriptions(): void {
    this.isLoading = true;

    this.pharmacistService.getPendingPrescriptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prescriptions) => {
          this.dataSource.data = prescriptions;
          this.totalPrescriptions = prescriptions.length;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading prescriptions:', error);
          this.snackBar.open('Error loading prescriptions', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    let filteredData = this.dataSource.data;

    // Apply status filter
    if (this.statusFilter.value !== 'all') {
      filteredData = filteredData.filter(prescription => 
        prescription.status === this.statusFilter.value
      );
    }

    // Apply payment filter
    if (this.paymentFilter.value !== 'all') {
      filteredData = filteredData.filter(prescription => 
        prescription.paymentStatus === this.paymentFilter.value
      );
    }

    // Update data source with filtered data
    this.dataSource.data = filteredData;
  }

  viewPrescriptionDetails(prescription: Prescription): void {
    const dialogRef = this.dialog.open(PrescriptionDetailsDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: { prescription }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'verified' || result?.action === 'dispensed') {
        this.loadPrescriptions();
        this.snackBar.open(
          `Prescription ${result.action} successfully`, 
          'Close', 
          { duration: 3000 }
        );
      }
    });
  }

  verifyPrescription(prescription: Prescription): void {
    if (prescription.paymentStatus !== 'paid') {
      this.snackBar.open(
        'Cannot verify prescription. Payment not confirmed.', 
        'Close', 
        { duration: 4000 }
      );
      return;
    }

    this.pharmacistService.verifyPrescription(prescription.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Prescription verified successfully', 'Close', { duration: 3000 });
          this.loadPrescriptions();
        },
        error: (error) => {
          console.error('Error verifying prescription:', error);
          this.snackBar.open('Error verifying prescription', 'Close', { duration: 3000 });
        }
      });
  }

  checkPaymentStatus(prescription: Prescription): void {
    const dialogRef = this.dialog.open(PaymentVerificationComponent, {
      width: '600px',
      data: { prescriptionId: prescription.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.updated) {
        this.loadPrescriptions();
      }
    });
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

  canVerifyPrescription(prescription: Prescription): boolean {
    return prescription.status === 'pending' && 
           prescription.paymentStatus === 'paid' && 
           prescription.isAuthentic;
  }

  canDispensePrescription(prescription: Prescription): boolean {
    return prescription.status === 'verified' && 
           prescription.paymentStatus === 'paid';
  }

  refreshPrescriptions(): void {
    this.loadPrescriptions();
  }

  exportPrescriptions(): void {
    // Implementation for exporting prescriptions data
    this.snackBar.open('Export functionality will be implemented', 'Close', { duration: 2000 });
  }
}