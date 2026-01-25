import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { InsuranceService, InsuranceClaim, ClaimStatus } from '../../services/insurance.service';
import { ClaimDetailsDialogComponent } from '../../dialogs/claim-details-dialog/claim-details-dialog.component';

@Component({
  selector: 'app-claim-tracking',
  templateUrl: './claim-tracking.component.html',
  styleUrls: ['./claim-tracking.component.scss']
})
export class ClaimTrackingComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'claimNumber',
    'patientName',
    'insuranceProvider',
    'submissionDate',
    'status',
    'billedAmount',
    'approvedAmount',
    'actions'
  ];

  dataSource = new MatTableDataSource<InsuranceClaim>();
  loading = true;
  
  // Filter options
  statusFilter = '';
  insurerFilter = '';
  dateRangeFilter = {
    start: null,
    end: null
  };

  statusOptions = Object.values(ClaimStatus);
  insurerOptions: string[] = [];

  constructor(
    private insuranceService: InsuranceService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadClaims();
    this.loadInsurerOptions();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadClaims(): void {
    this.loading = true;
    
    const filters = this.buildFilters();
    
    this.insuranceService.getClaims(filters).subscribe({
      next: (claims) => {
        this.dataSource.data = claims;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading claims:', error);
        this.loading = false;
      }
    });
  }

  private loadInsurerOptions(): void {
    // In a real implementation, this would come from a configuration service
    this.insurerOptions = [
      'Blue Cross Blue Shield',
      'Aetna',
      'Cigna',
      'UnitedHealthcare',
      'Humana',
      'MetLife',
      'Delta Dental',
      'Guardian'
    ];
  }

  private buildFilters(): any {
    const filters: any = {};
    
    if (this.statusFilter) {
      filters.status = this.statusFilter;
    }
    
    if (this.insurerFilter) {
      filters.insuranceProvider = this.insurerFilter;
    }
    
    if (this.dateRangeFilter.start) {
      filters.startDate = this.dateRangeFilter.start;
    }
    
    if (this.dateRangeFilter.end) {
      filters.endDate = this.dateRangeFilter.end;
    }
    
    return filters;
  }

  applyFilters(): void {
    this.loadClaims();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.insurerFilter = '';
    this.dateRangeFilter = { start: null, end: null };
    this.loadClaims();
  }

  applySearch(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  viewClaimDetails(claim: InsuranceClaim): void {
    const dialogRef = this.dialog.open(ClaimDetailsDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: { claimId: claim.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.updated) {
        this.loadClaims();
      }
    });
  }

  getStatusColor(status: ClaimStatus): string {
    return this.insuranceService.getClaimStatusColor(status);
  }

  getStatusIcon(status: ClaimStatus): string {
    return this.insuranceService.getClaimStatusIcon(status);
  }

  exportClaims(): void {
    const filters = this.buildFilters();
    
    this.insuranceService.exportReport('claims', filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `claims-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting claims:', error);
      }
    });
  }

  refreshData(): void {
    this.loadClaims();
  }

  getClaimAge(submissionDate: Date): number {
    const today = new Date();
    const submission = new Date(submissionDate);
    const diffTime = Math.abs(today.getTime() - submission.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isClaimOverdue(claim: InsuranceClaim): boolean {
    const age = this.getClaimAge(claim.submissionDate);
    return age > 30 && (claim.status === ClaimStatus.SUBMITTED || claim.status === ClaimStatus.UNDER_REVIEW);
  }
}