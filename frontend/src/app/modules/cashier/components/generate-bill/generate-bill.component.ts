import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { 
  CashierBillingService, 
  CompletedTreatment, 
  BillGenerationRequest 
} from '../../services/cashier-billing.service';
import { InvoiceDetailsDialogComponent } from '../../dialogs/invoice-details-dialog/invoice-details-dialog.component';

@Component({
  selector: 'app-generate-bill',
  templateUrl: './generate-bill.component.html',
  styleUrls: ['./generate-bill.component.scss']
})
export class GenerateBillComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();

  displayedColumns: string[] = [
    'patientName',
    'doctorName',
    'treatmentDate',
    'services',
    'totalAmount',
    'status',
    'actions'
  ];

  dataSource = new MatTableDataSource<CompletedTreatment>();
  isLoading = true;
  error: string | null = null;

  // Filters
  searchControl = new FormControl('');
  statusFilter = new FormControl('completed');
  dateFromControl = new FormControl();
  dateToControl = new FormControl();

  statusOptions = [
    { value: 'completed', label: 'Completed (Not Billed)' },
    { value: 'billed', label: 'Billed' },
    { value: 'all', label: 'All Treatments' }
  ];

  constructor(
    private billingService: CashierBillingService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setupFilters();
    this.loadTreatments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters(): void {
    // Search filter
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });

    // Status filter
    this.statusFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadTreatments();
      });

    // Date filters
    this.dateFromControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadTreatments();
      });

    this.dateToControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadTreatments();
      });
  }

  private loadTreatments(): void {
    this.isLoading = true;
    this.error = null;

    const filters: any = {};
    
    if (this.statusFilter.value && this.statusFilter.value !== 'all') {
      filters.status = this.statusFilter.value;
    }
    
    if (this.dateFromControl.value) {
      filters.dateFrom = this.dateFromControl.value.toISOString().split('T')[0];
    }
    
    if (this.dateToControl.value) {
      filters.dateTo = this.dateToControl.value.toISOString().split('T')[0];
    }

    this.billingService.getCompletedTreatments(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (treatments) => {
          this.dataSource.data = treatments;
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading treatments:', error);
          this.error = 'Failed to load completed treatments. Please try again.';
          this.isLoading = false;
        }
      });
  }

  private applyFilters(): void {
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    
    this.dataSource.filterPredicate = (data: CompletedTreatment, filter: string) => {
      return data.patientName.toLowerCase().includes(filter) ||
             data.doctorName.toLowerCase().includes(filter) ||
             data.services.some(s => s.serviceName.toLowerCase().includes(filter));
    };
    
    this.dataSource.filter = searchTerm;
  }

  generateBill(treatment: CompletedTreatment): void {
    const dialogRef = this.dialog.open(InvoiceDetailsDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { 
        treatment: treatment,
        mode: 'generate'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'generated') {
        this.snackBar.open('Bill generated successfully', 'Close', { duration: 3000 });
        this.loadTreatments();
      }
    });
  }

  viewTreatmentDetails(treatment: CompletedTreatment): void {
    const dialogRef = this.dialog.open(InvoiceDetailsDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { 
        treatment: treatment,
        mode: 'view'
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'warn';
      case 'billed':
        return 'primary';
      case 'paid':
        return 'accent';
      default:
        return 'primary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed':
        return 'Ready to Bill';
      case 'billed':
        return 'Billed';
      case 'paid':
        return 'Paid';
      default:
        return status;
    }
  }

  canGenerateBill(treatment: CompletedTreatment): boolean {
    return treatment.status === 'completed';
  }

  getServicesCount(treatment: CompletedTreatment): number {
    return treatment.services.length;
  }

  getServicesPreview(treatment: CompletedTreatment): string {
    const serviceNames = treatment.services.slice(0, 2).map(s => s.serviceName);
    if (treatment.services.length > 2) {
      serviceNames.push(`+${treatment.services.length - 2} more`);
    }
    return serviceNames.join(', ');
  }

  refreshTreatments(): void {
    this.loadTreatments();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.statusFilter.setValue('completed');
    this.dateFromControl.setValue(null);
    this.dateToControl.setValue(null);
  }

  exportTreatments(): void {
    // Implementation for exporting treatments
    console.log('Export treatments functionality');
  }
}