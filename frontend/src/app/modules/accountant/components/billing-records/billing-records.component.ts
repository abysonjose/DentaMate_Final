import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AccountantService, BillingRecord } from '../../services/accountant.service';

@Component({
  selector: 'app-billing-records',
  templateUrl: './billing-records.component.html',
  styleUrls: ['./billing-records.component.scss']
})
export class BillingRecordsComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'billDate',
    'patientName',
    'doctorName',
    'department',
    'amount',
    'status',
    'services',
    'actions'
  ];

  dataSource = new MatTableDataSource<BillingRecord>();
  loading = true;
  filterForm: FormGroup;

  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'PAID', label: 'Paid' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'OVERDUE', label: 'Overdue' }
  ];

  departmentOptions = [
    { value: '', label: 'All Departments' },
    { value: 'GENERAL', label: 'General Dentistry' },
    { value: 'ORTHODONTICS', label: 'Orthodontics' },
    { value: 'ORAL_SURGERY', label: 'Oral Surgery' },
    { value: 'PERIODONTICS', label: 'Periodontics' },
    { value: 'ENDODONTICS', label: 'Endodontics' }
  ];

  constructor(
    private accountantService: AccountantService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      status: [''],
      department: [''],
      doctorName: [''],
      patientName: ['']
    });
  }

  ngOnInit(): void {
    this.loadBillingRecords();
    this.setupFilterSubscription();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadBillingRecords(): void {
    this.loading = true;
    const filters = this.filterForm.value;
    
    this.accountantService.getBillingRecords(filters).subscribe({
      next: (records) => {
        this.dataSource.data = records;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading billing records:', error);
        this.snackBar.open('Error loading billing records', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  setupFilterSubscription(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.loadBillingRecords();
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadBillingRecords();
  }

  flagDiscrepancy(record: BillingRecord): void {
    const flag = prompt('Enter discrepancy description:');
    if (flag) {
      this.accountantService.flagBillingDiscrepancy(record.id, flag).subscribe({
        next: () => {
          this.snackBar.open('Discrepancy flagged successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadBillingRecords();
        },
        error: (error) => {
          console.error('Error flagging discrepancy:', error);
          this.snackBar.open('Error flagging discrepancy', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  viewBillDetails(record: BillingRecord): void {
    // Open bill details dialog
    console.log('View bill details:', record);
  }

  exportRecords(): void {
    const filters = this.filterForm.value;
    this.accountantService.exportReport('billing-records', 'CSV', filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `billing-records-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting records:', error);
        this.snackBar.open('Error exporting records', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PAID': return 'success';
      case 'PENDING': return 'warning';
      case 'OVERDUE': return 'danger';
      default: return 'default';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PAID': return 'check_circle';
      case 'PENDING': return 'schedule';
      case 'OVERDUE': return 'error';
      default: return 'help';
    }
  }
}