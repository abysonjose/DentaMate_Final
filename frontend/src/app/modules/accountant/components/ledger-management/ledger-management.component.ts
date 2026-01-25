import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AccountantService, LedgerEntry } from '../../services/accountant.service';
import { LedgerTagDialogComponent } from '../../dialogs/ledger-tag-dialog/ledger-tag-dialog.component';

@Component({
  selector: 'app-ledger-management',
  templateUrl: './ledger-management.component.html',
  styleUrls: ['./ledger-management.component.scss']
})
export class LedgerManagementComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'date',
    'description',
    'amount',
    'type',
    'category',
    'departmentCode',
    'costCenter',
    'tags',
    'actions'
  ];

  dataSource = new MatTableDataSource<LedgerEntry>();
  loading = true;
  filterForm: FormGroup;

  typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'DEBIT', label: 'Debit' },
    { value: 'CREDIT', label: 'Credit' }
  ];

  categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'REVENUE', label: 'Revenue' },
    { value: 'EXPENSE', label: 'Expense' },
    { value: 'ASSET', label: 'Asset' },
    { value: 'LIABILITY', label: 'Liability' },
    { value: 'EQUITY', label: 'Equity' }
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
      type: [''],
      category: [''],
      departmentCode: [''],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadLedgerEntries();
    this.setupFilterSubscription();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadLedgerEntries(): void {
    this.loading = true;
    const filters = this.filterForm.value;
    
    this.accountantService.getLedgerEntries(filters).subscribe({
      next: (entries) => {
        this.dataSource.data = entries;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading ledger entries:', error);
        this.snackBar.open('Error loading ledger entries', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  setupFilterSubscription(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.loadLedgerEntries();
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadLedgerEntries();
  }

  openTagDialog(entry: LedgerEntry): void {
    const dialogRef = this.dialog.open(LedgerTagDialogComponent, {
      width: '500px',
      data: { entry }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateLedgerTags(entry.id, result.tags);
      }
    });
  }

  updateLedgerTags(entryId: string, tags: string[]): void {
    this.accountantService.updateLedgerTags(entryId, tags).subscribe({
      next: () => {
        this.snackBar.open('Ledger tags updated successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadLedgerEntries();
      },
      error: (error) => {
        console.error('Error updating ledger tags:', error);
        this.snackBar.open('Error updating ledger tags', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  exportLedger(): void {
    const filters = this.filterForm.value;
    this.accountantService.exportReport('ledger-entries', 'CSV', filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ledger-entries-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting ledger:', error);
        this.snackBar.open('Error exporting ledger', 'Close', {
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

  getTypeColor(type: string): string {
    return type === 'DEBIT' ? 'warn' : 'primary';
  }

  getTypeIcon(type: string): string {
    return type === 'DEBIT' ? 'remove' : 'add';
  }

  getTotalDebit(): number {
    return this.dataSource.data
      .filter(entry => entry.type === 'DEBIT')
      .reduce((sum, entry) => sum + entry.amount, 0);
  }

  getTotalCredit(): number {
    return this.dataSource.data
      .filter(entry => entry.type === 'CREDIT')
      .reduce((sum, entry) => sum + entry.amount, 0);
  }

  getBalance(): number {
    return this.getTotalCredit() - this.getTotalDebit();
  }
}