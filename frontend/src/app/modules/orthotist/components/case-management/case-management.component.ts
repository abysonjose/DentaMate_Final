import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { OrthotistService, OrthodonticCase } from '../../services/orthotist.service';
import { CaseDetailsDialogComponent } from '../../dialogs/case-details-dialog/case-details-dialog.component';

@Component({
  selector: 'app-case-management',
  templateUrl: './case-management.component.html',
  styleUrls: ['./case-management.component.scss']
})
export class CaseManagementComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();
  
  displayedColumns: string[] = [
    'id', 'patientName', 'doctorName', 'caseType', 
    'priority', 'status', 'createdDate', 'estimatedDeliveryDate', 'actions'
  ];
  
  dataSource = new MatTableDataSource<OrthodonticCase>();
  loading = true;
  
  // Filters
  statusFilter = '';
  priorityFilter = '';
  caseTypeFilter = '';
  searchTerm = '';
  
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'RECEIVED', label: 'Received' },
    { value: 'IN_MEASUREMENT_REVIEW', label: 'In Measurement Review' },
    { value: 'IN_FABRICATION', label: 'In Fabrication' },
    { value: 'READY', label: 'Ready' },
    { value: 'DELIVERED', label: 'Delivered' }
  ];
  
  priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' }
  ];
  
  caseTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'BRACES', label: 'Braces' },
    { value: 'ALIGNERS', label: 'Aligners' },
    { value: 'RETAINER', label: 'Retainer' },
    { value: 'APPLIANCE', label: 'Appliance' }
  ];

  constructor(
    private orthotistService: OrthotistService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCases();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Custom filter predicate
    this.dataSource.filterPredicate = (data: OrthodonticCase, filter: string) => {
      const searchStr = (
        data.id + 
        data.patientName + 
        data.doctorName + 
        data.caseType + 
        data.priority + 
        data.status
      ).toLowerCase();
      
      return searchStr.includes(filter.toLowerCase());
    };
  }

  loadCases(): void {
    this.loading = true;
    
    this.orthotistService.getCases()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cases) => {
          this.dataSource.data = cases;
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading cases:', error);
          this.loading = false;
        }
      });
  }

  applyFilters(): void {
    let filteredData = this.dataSource.data;
    
    // Apply status filter
    if (this.statusFilter) {
      filteredData = filteredData.filter(case => case.status === this.statusFilter);
    }
    
    // Apply priority filter
    if (this.priorityFilter) {
      filteredData = filteredData.filter(case => case.priority === this.priorityFilter);
    }
    
    // Apply case type filter
    if (this.caseTypeFilter) {
      filteredData = filteredData.filter(case => case.caseType === this.caseTypeFilter);
    }
    
    // Apply search term
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filteredData = filteredData.filter(case => 
        case.id.toLowerCase().includes(searchLower) ||
        case.patientName.toLowerCase().includes(searchLower) ||
        case.doctorName.toLowerCase().includes(searchLower)
      );
    }
    
    this.dataSource.data = filteredData;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.priorityFilter = '';
    this.caseTypeFilter = '';
    this.searchTerm = '';
    this.loadCases();
  }

  viewCaseDetails(caseData: OrthodonticCase): void {
    const dialogRef = this.dialog.open(CaseDetailsDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { case: caseData }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.updated) {
        this.loadCases();
      }
    });
  }

  updateCaseStatus(caseId: string, newStatus: string): void {
    this.orthotistService.updateCaseStatus(caseId, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadCases();
        },
        error: (error) => {
          console.error('Error updating case status:', error);
        }
      });
  }

  getStatusColor(status: string): string {
    return this.orthotistService.getCaseStatusColor(status);
  }

  getPriorityColor(priority: string): string {
    return this.orthotistService.getPriorityColor(priority);
  }

  getStatusDisplayName(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  isOverdue(estimatedDate: Date | undefined): boolean {
    if (!estimatedDate) return false;
    return new Date(estimatedDate) < new Date();
  }

  getDaysOverdue(estimatedDate: Date): number {
    const today = new Date();
    const estimated = new Date(estimatedDate);
    const diffTime = today.getTime() - estimated.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  refreshCases(): void {
    this.loadCases();
  }
}