import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';

import { ClinicService, Clinic } from '../../services/clinic.service';
import { CreateClinicDialogComponent } from '../../dialogs/create-clinic-dialog/create-clinic-dialog.component';

@Component({
  selector: 'app-clinic-management',
  templateUrl: './clinic-management.component.html',
  styleUrls: ['./clinic-management.component.scss']
})
export class ClinicManagementComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'select',
    'name',
    'domain',
    'subscriptionPlan',
    'subscriptionStatus',
    'currentUsers',
    'currentBranches',
    'lastActivity',
    'actions'
  ];

  dataSource = new MatTableDataSource<Clinic>();
  selection = new SelectionModel<Clinic>(true, []);
  
  isLoading = true;
  searchQuery = '';
  statusFilter = 'all';
  planFilter = 'all';

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'expired', label: 'Expired' }
  ];

  planOptions = [
    { value: 'all', label: 'All Plans' },
    { value: 'basic', label: 'Basic' },
    { value: 'professional', label: 'Professional' },
    { value: 'enterprise', label: 'Enterprise' },
    { value: 'custom', label: 'Custom' }
  ];

  constructor(
    private clinicService: ClinicService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadClinics();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadClinics(): void {
    this.isLoading = true;
    
    // Mock data for now - replace with real API call
    setTimeout(() => {
      const mockClinics: Clinic[] = [
        {
          id: '1',
          name: 'Downtown Dental Clinic',
          domain: 'downtown-dental',
          email: 'admin@downtown-dental.com',
          phone: '+1-555-0101',
          address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          },
          subscriptionPlan: 'professional',
          subscriptionStatus: 'active',
          licenseKey: 'DDC-PRO-2024-001',
          maxUsers: 50,
          currentUsers: 35,
          maxBranches: 5,
          currentBranches: 3,
          features: ['ai-diagnosis', 'ocr-scanning', 'realtime-queue'],
          createdAt: new Date('2024-01-15'),
          lastActivity: new Date('2024-01-20'),
          isActive: true,
          timezone: 'America/New_York',
          currency: 'USD',
          language: 'en',
          settings: {
            aiEnabled: true,
            ocrEnabled: true,
            realtimeQueueEnabled: true,
            multiTenantEnabled: true
          }
        },
        {
          id: '2',
          name: 'Smile Care Center',
          domain: 'smile-care',
          email: 'contact@smile-care.com',
          phone: '+1-555-0102',
          address: {
            street: '456 Oak Ave',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90210',
            country: 'USA'
          },
          subscriptionPlan: 'enterprise',
          subscriptionStatus: 'active',
          licenseKey: 'SCC-ENT-2024-002',
          maxUsers: 100,
          currentUsers: 78,
          maxBranches: 10,
          currentBranches: 7,
          features: ['ai-diagnosis', 'ocr-scanning', 'realtime-queue', 'advanced-analytics'],
          createdAt: new Date('2023-11-20'),
          lastActivity: new Date('2024-01-21'),
          isActive: true,
          timezone: 'America/Los_Angeles',
          currency: 'USD',
          language: 'en',
          settings: {
            aiEnabled: true,
            ocrEnabled: true,
            realtimeQueueEnabled: true,
            multiTenantEnabled: true
          }
        },
        {
          id: '3',
          name: 'Family Dental Practice',
          domain: 'family-dental',
          email: 'info@family-dental.com',
          phone: '+1-555-0103',
          address: {
            street: '789 Pine St',
            city: 'Chicago',
            state: 'IL',
            zipCode: '60601',
            country: 'USA'
          },
          subscriptionPlan: 'basic',
          subscriptionStatus: 'suspended',
          licenseKey: 'FDP-BAS-2024-003',
          maxUsers: 20,
          currentUsers: 15,
          maxBranches: 2,
          currentBranches: 1,
          features: ['basic-scheduling'],
          createdAt: new Date('2024-01-10'),
          lastActivity: new Date('2024-01-18'),
          isActive: false,
          timezone: 'America/Chicago',
          currency: 'USD',
          language: 'en',
          settings: {
            aiEnabled: false,
            ocrEnabled: false,
            realtimeQueueEnabled: false,
            multiTenantEnabled: false
          }
        }
      ];
      
      this.dataSource.data = mockClinics;
      this.isLoading = false;
    }, 1000);
  }

  applyFilter(): void {
    let filteredData = this.dataSource.data;

    // Search filter
    if (this.searchQuery) {
      filteredData = filteredData.filter(clinic =>
        clinic.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        clinic.domain.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        clinic.email.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      filteredData = filteredData.filter(clinic => clinic.subscriptionStatus === this.statusFilter);
    }

    // Plan filter
    if (this.planFilter !== 'all') {
      filteredData = filteredData.filter(clinic => clinic.subscriptionPlan === this.planFilter);
    }

    this.dataSource.data = filteredData;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.planFilter = 'all';
    this.loadClinics();
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle(): void {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }

  createClinic(): void {
    const dialogRef = this.dialog.open(CreateClinicDialogComponent, {
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.clinicService.createClinic(result).subscribe({
          next: () => {
            this.showSuccess('Clinic created successfully');
            this.loadClinics();
          },
          error: (error) => {
            this.showError('Failed to create clinic: ' + error.message);
          }
        });
      }
    });
  }

  editClinic(clinic: Clinic): void {
    // TODO: Implement edit clinic dialog
    this.showInfo('Edit clinic functionality coming soon');
  }

  viewClinic(clinic: Clinic): void {
    // TODO: Implement view clinic details
    this.showInfo('View clinic details functionality coming soon');
  }

  toggleClinicStatus(clinic: Clinic): void {
    const action = clinic.isActive ? 'deactivate' : 'activate';
    const service = clinic.isActive ? 
      this.clinicService.deactivateClinic(clinic.id) : 
      this.clinicService.activateClinic(clinic.id);

    service.subscribe({
      next: () => {
        clinic.isActive = !clinic.isActive;
        clinic.subscriptionStatus = clinic.isActive ? 'active' : 'inactive';
        this.showSuccess(`Clinic ${action}d successfully`);
      },
      error: (error) => {
        this.showError(`Failed to ${action} clinic: ` + error.message);
      }
    });
  }

  suspendClinic(clinic: Clinic): void {
    // TODO: Implement suspend clinic with reason dialog
    this.clinicService.suspendClinic(clinic.id, 'Administrative action').subscribe({
      next: () => {
        clinic.subscriptionStatus = 'suspended';
        clinic.isActive = false;
        this.showSuccess('Clinic suspended successfully');
      },
      error: (error) => {
        this.showError('Failed to suspend clinic: ' + error.message);
      }
    });
  }

  regenerateLicense(clinic: Clinic): void {
    this.clinicService.generateLicenseKey(clinic.id).subscribe({
      next: (response) => {
        clinic.licenseKey = response.licenseKey;
        this.showSuccess('License key regenerated successfully');
      },
      error: (error) => {
        this.showError('Failed to regenerate license: ' + error.message);
      }
    });
  }

  bulkAction(action: string): void {
    const selectedClinics = this.selection.selected;
    if (selectedClinics.length === 0) {
      this.showError('Please select clinics to perform bulk action');
      return;
    }

    const clinicIds = selectedClinics.map(clinic => clinic.id);
    
    switch (action) {
      case 'activate':
        this.clinicService.bulkUpdateStatus(clinicIds, 'active').subscribe({
          next: () => {
            this.showSuccess(`${selectedClinics.length} clinics activated`);
            this.loadClinics();
            this.selection.clear();
          },
          error: (error) => this.showError('Bulk activation failed: ' + error.message)
        });
        break;
      case 'deactivate':
        this.clinicService.bulkUpdateStatus(clinicIds, 'inactive').subscribe({
          next: () => {
            this.showSuccess(`${selectedClinics.length} clinics deactivated`);
            this.loadClinics();
            this.selection.clear();
          },
          error: (error) => this.showError('Bulk deactivation failed: ' + error.message)
        });
        break;
    }
  }

  exportData(): void {
    this.clinicService.exportClinicsData('csv').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `clinics-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.showSuccess('Clinics data exported successfully');
      },
      error: (error) => {
        this.showError('Failed to export data: ' + error.message);
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'inactive': return 'warn';
      case 'suspended': return 'warn';
      case 'expired': return 'warn';
      default: return 'primary';
    }
  }

  getPlanColor(plan: string): string {
    switch (plan) {
      case 'basic': return 'accent';
      case 'professional': return 'primary';
      case 'enterprise': return 'warn';
      case 'custom': return 'primary';
      default: return 'primary';
    }
  }

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

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }
}