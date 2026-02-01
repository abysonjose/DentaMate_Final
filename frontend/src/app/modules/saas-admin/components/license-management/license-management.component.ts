import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';

import { LicenseService, License } from '../../services/license.service';
import { IssueLicenseDialogComponent } from '../../dialogs/issue-license-dialog/issue-license-dialog.component';
import { SuspendLicenseDialogComponent } from '../../dialogs/suspend-license-dialog/suspend-license-dialog.component';
import { RevokeLicenseDialogComponent } from '../../dialogs/revoke-license-dialog/revoke-license-dialog.component';

@Component({
  selector: 'app-license-management',
  templateUrl: './license-management.component.html',
  styleUrls: ['./license-management.component.scss']
})
export class LicenseManagementComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  private destroy$ = new Subject<void>();
  
  displayedColumns: string[] = [
    'select',
    'licenseKey',
    'tenantName',
    'planName',
    'status',
    'validity',
    'usage',
    'actions'
  ];
  
  dataSource = new MatTableDataSource<License>();
  loading = true;
  selectedLicenses = new Set<string>();
  
  // Filters
  searchControl = new FormControl('');
  statusFilter = new FormControl('all');
  planFilter = new FormControl('all');
  expiryFilter = new FormControl('all');
  
  statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'TRIAL', label: 'Trial' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'REVOKED', label: 'Revoked' }
  ];
  
  planOptions = [
    { value: 'all', label: 'All Plans' },
    { value: 'basic', label: 'Basic' },
    { value: 'professional', label: 'Professional' },
    { value: 'enterprise', label: 'Enterprise' },
    { value: 'custom', label: 'Custom' }
  ];
  
  expiryOptions = [
    { value: 'all', label: 'All Licenses' },
    { value: 'expiring_7', label: 'Expiring in 7 days' },
    { value: 'expiring_30', label: 'Expiring in 30 days' },
    { value: 'expired', label: 'Already Expired' }
  ];
  
  // Statistics
  stats = {
    total: 0,
    active: 0,
    trial: 0,
    suspended: 0,
    expired: 0,
    expiringSoon: 0
  };

  constructor(
    private licenseService: LicenseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setupFilters();
    this.loadLicenses();
    this.loadStatistics();
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
        this.applyFilters();
      });

    // Plan filter
    this.planFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });

    // Expiry filter
    this.expiryFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  private loadLicenses(): void {
    this.loading = true;
    
    this.licenseService.getAllLicenses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.licenses;
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
          this.loading = false;
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error loading licenses:', error);
          this.snackBar.open('Error loading licenses', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  private loadStatistics(): void {
    this.licenseService.getLicenseStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.stats = stats;
      });
  }

  private applyFilters(): void {
    this.dataSource.filterPredicate = (license: License, filter: string) => {
      const searchTerm = this.searchControl.value?.toLowerCase() || '';
      const statusFilter = this.statusFilter.value;
      const planFilter = this.planFilter.value;
      const expiryFilter = this.expiryFilter.value;

      // Search filter
      const matchesSearch = !searchTerm || 
        license.licenseKey.toLowerCase().includes(searchTerm) ||
        license.tenantId.toLowerCase().includes(searchTerm);

      // Status filter
      const matchesStatus = statusFilter === 'all' || license.status === statusFilter;

      // Plan filter
      const matchesPlan = planFilter === 'all' || license.planId === planFilter;

      // Expiry filter
      let matchesExpiry = true;
      if (expiryFilter !== 'all') {
        const now = new Date();
        const endDate = new Date(license.validity.endDate);
        const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        switch (expiryFilter) {
          case 'expiring_7':
            matchesExpiry = daysUntilExpiry <= 7 && daysUntilExpiry > 0;
            break;
          case 'expiring_30':
            matchesExpiry = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
            break;
          case 'expired':
            matchesExpiry = daysUntilExpiry <= 0;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesPlan && matchesExpiry;
    };

    this.dataSource.filter = 'trigger'; // Trigger filter
  }

  isAllSelected(): boolean {
    const numSelected = this.selectedLicenses.size;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selectedLicenses.clear();
    } else {
      this.dataSource.data.forEach(license => {
        this.selectedLicenses.add(license.licenseId);
      });
    }
  }

  toggleSelection(licenseId: string): void {
    if (this.selectedLicenses.has(licenseId)) {
      this.selectedLicenses.delete(licenseId);
    } else {
      this.selectedLicenses.add(licenseId);
    }
  }

  isSelected(licenseId: string): boolean {
    return this.selectedLicenses.has(licenseId);
  }

  openIssueLicenseDialog(): void {
    const dialogRef = this.dialog.open(IssueLicenseDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadLicenses();
        this.loadStatistics();
        this.snackBar.open('License issued successfully', 'Close', { duration: 3000 });
      }
    });
  }

  renewLicense(license: License): void {
    this.licenseService.renewLicense(license.licenseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadLicenses();
          this.loadStatistics();
          this.snackBar.open('License renewed successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error renewing license:', error);
          this.snackBar.open('Error renewing license', 'Close', { duration: 3000 });
        }
      });
  }

  suspendLicense(license: License): void {
    const dialogRef = this.dialog.open(SuspendLicenseDialogComponent, {
      width: '500px',
      data: { license }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadLicenses();
        this.loadStatistics();
        this.snackBar.open('License suspended successfully', 'Close', { duration: 3000 });
      }
    });
  }

  revokeLicense(license: License): void {
    const dialogRef = this.dialog.open(RevokeLicenseDialogComponent, {
      width: '500px',
      data: { license }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadLicenses();
        this.loadStatistics();
        this.snackBar.open('License revoked successfully', 'Close', { duration: 3000 });
      }
    });
  }

  reactivateLicense(license: License): void {
    this.licenseService.reactivateLicense(license.licenseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadLicenses();
          this.loadStatistics();
          this.snackBar.open('License reactivated successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error reactivating license:', error);
          this.snackBar.open('Error reactivating license', 'Close', { duration: 3000 });
        }
      });
  }

  bulkSuspend(): void {
    if (this.selectedLicenses.size === 0) {
      this.snackBar.open('Please select licenses to suspend', 'Close', { duration: 3000 });
      return;
    }

    const licenseIds = Array.from(this.selectedLicenses);
    this.licenseService.bulkSuspendLicenses(licenseIds, 'Bulk suspension')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectedLicenses.clear();
          this.loadLicenses();
          this.loadStatistics();
          this.snackBar.open(`${licenseIds.length} licenses suspended`, 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error suspending licenses:', error);
          this.snackBar.open('Error suspending licenses', 'Close', { duration: 3000 });
        }
      });
  }

  bulkReactivate(): void {
    if (this.selectedLicenses.size === 0) {
      this.snackBar.open('Please select licenses to reactivate', 'Close', { duration: 3000 });
      return;
    }

    const licenseIds = Array.from(this.selectedLicenses);
    this.licenseService.bulkReactivateLicenses(licenseIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectedLicenses.clear();
          this.loadLicenses();
          this.loadStatistics();
          this.snackBar.open(`${licenseIds.length} licenses reactivated`, 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error reactivating licenses:', error);
          this.snackBar.open('Error reactivating licenses', 'Close', { duration: 3000 });
        }
      });
  }

  exportLicenses(): void {
    this.licenseService.exportLicenses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `licenses-${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.snackBar.open('Licenses exported successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error exporting licenses:', error);
          this.snackBar.open('Error exporting licenses', 'Close', { duration: 3000 });
        }
      });
  }

  refreshData(): void {
    this.loadLicenses();
    this.loadStatistics();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'primary';
      case 'TRIAL': return 'accent';
      case 'SUSPENDED': return 'warn';
      case 'EXPIRED': return 'warn';
      case 'REVOKED': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'check_circle';
      case 'TRIAL': return 'schedule';
      case 'SUSPENDED': return 'pause_circle';
      case 'EXPIRED': return 'error';
      case 'REVOKED': return 'cancel';
      default: return 'help';
    }
  }

  getDaysUntilExpiry(endDate: string): number {
    const now = new Date();
    const expiry = new Date(endDate);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  formatUsage(usage: any, limits: any): string {
    const usagePercent = Math.round((usage.currentUsers / limits.maxUsers) * 100);
    return `${usage.currentUsers}/${limits.maxUsers} users (${usagePercent}%)`;
  }
}