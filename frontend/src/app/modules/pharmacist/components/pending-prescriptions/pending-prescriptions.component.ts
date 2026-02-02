import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';

import { PharmacistPrescriptionService, PendingPrescription } from '../../services/pharmacist-prescription.service';
import { PrescriptionDetailsDialogComponent } from '../../dialogs/prescription-details-dialog/prescription-details-dialog.component';

@Component({
  selector: 'app-pending-prescriptions',
  templateUrl: './pending-prescriptions.component.html',
  styleUrls: ['./pending-prescriptions.component.scss']
})
export class PendingPrescriptionsComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();

  displayedColumns: string[] = [
    'prescriptionNumber',
    'patientName',
    'doctorName',
    'prescribedDate',
    'totalItems',
    'priority',
    'status',
    'actions'
  ];

  dataSource = new MatTableDataSource<PendingPrescription>();
  isLoading = true;
  error: string | null = null;

  // Filters
  searchControl = new FormControl('');
  statusFilter = new FormControl('all');
  priorityFilter = new FormControl('all');

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'partially_dispensed', label: 'Partially Dispensed' },
    { value: 'ready_for_pickup', label: 'Ready for Pickup' }
  ];

  priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'normal', label: 'Normal' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'emergency', label: 'Emergency' }
  ];

  constructor(
    private prescriptionService: PharmacistPrescriptionService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.setupFilters();
    this.loadPrescriptions();
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
        this.loadPrescriptions();
      });

    // Priority filter
    this.priorityFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadPrescriptions();
      });
  }

  private loadPrescriptions(): void {
    this.isLoading = true;
    this.error = null;

    const filters: any = {};
    
    if (this.statusFilter.value && this.statusFilter.value !== 'all') {
      filters.status = this.statusFilter.value;
    }
    
    if (this.priorityFilter.value && this.priorityFilter.value !== 'all') {
      filters.priority = this.priorityFilter.value;
    }

    this.prescriptionService.getPendingPrescriptions(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prescriptions) => {
          this.dataSource.data = prescriptions;
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading prescriptions:', error);
          this.error = 'Failed to load prescriptions. Please try again.';
          this.isLoading = false;
        }
      });
  }

  private applyFilters(): void {
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    
    this.dataSource.filterPredicate = (data: PendingPrescription, filter: string) => {
      return data.patientName.toLowerCase().includes(filter) ||
             data.doctorName.toLowerCase().includes(filter) ||
             data.prescriptionNumber.toLowerCase().includes(filter);
    };
    
    this.dataSource.filter = searchTerm;
  }

  viewPrescriptionDetails(prescription: PendingPrescription): void {
    const dialogRef = this.dialog.open(PrescriptionDetailsDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { prescription }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'dispensed' || result === 'updated') {
        this.loadPrescriptions();
      }
    });
  }

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

  refreshPrescriptions(): void {
    this.loadPrescriptions();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.statusFilter.setValue('all');
    this.priorityFilter.setValue('all');
  }

  exportPrescriptions(): void {
    // Implementation for exporting prescriptions
    console.log('Export prescriptions functionality');
  }
}