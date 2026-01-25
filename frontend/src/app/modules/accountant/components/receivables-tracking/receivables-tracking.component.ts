import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AccountantService, ReceivableRecord } from '../../services/accountant.service';

@Component({
  selector: 'app-receivables-tracking',
  templateUrl: './receivables-tracking.component.html',
  styleUrls: ['./receivables-tracking.component.scss']
})
export class ReceivablesTrackingComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'dueDate',
    'patientName',
    'billId',
    'amount',
    'agingDays',
    'agingCategory',
    'contactInfo',
    'actions'
  ];

  dataSource = new MatTableDataSource<ReceivableRecord>();
  loading = true;
  filterForm: FormGroup;

  agingCategoryOptions = [
    { value: '', label: 'All Categories' },
    { value: '0-7', label: '0-7 days' },
    { value: '8-30', label: '8-30 days' },
    { value: '30+', label: '30+ days' }
  ];

  constructor(
    private accountantService: AccountantService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      agingCategory: [''],
      patientName: [''],
      minAmount: [''],
      maxAmount: ['']
    });
  }

  ngOnInit(): void {
    this.loadReceivables();
    this.setupFilterSubscription();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadReceivables(): void {
    this.loading = true;
    const filters = this.filterForm.value;
    
    this.accountantService.getReceivables(filters).subscribe({
      next: (receivables) => {
        this.dataSource.data = receivables;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading receivables:', error);
        this.snackBar.open('Error loading receivables', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  setupFilterSubscription(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.loadReceivables();
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadReceivables();
  }

  notifyAccountsManager(record: ReceivableRecord): void {
    // Simulate notification to Accounts Manager
    this.snackBar.open(`Notification sent to Accounts Manager for ${record.patientName}`, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  exportReceivables(): void {
    const filters = this.filterForm.value;
    this.accountantService.exportReport('receivables', 'CSV', filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receivables-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting receivables:', error);
        this.snackBar.open('Error exporting receivables', 'Close', {
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

  getAgingColor(category: string): string {
    switch (category) {
      case '0-7': return 'success';
      case '8-30': return 'warning';
      case '30+': return 'danger';
      default: return 'default';
    }
  }

  getAgingIcon(category: string): string {
    switch (category) {
      case '0-7': return 'schedule';
      case '8-30': return 'warning';
      case '30+': return 'error';
      default: return 'help';
    }
  }

  getTotalReceivables(): number {
    return this.dataSource.data.reduce((sum, record) => sum + record.amount, 0);
  }

  getReceivablesByCategory(category: string): number {
    return this.dataSource.data
      .filter(record => record.agingCategory === category)
      .reduce((sum, record) => sum + record.amount, 0);
  }

  getCriticalOverdueCount(): number {
    return this.dataSource.data.filter(record => record.agingCategory === '30+').length;
  }
}