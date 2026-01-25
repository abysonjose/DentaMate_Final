import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PayrollOfficerService, PayrollCycle } from '../../services/payroll-officer.service';
import { CreatePayrollCycleDialogComponent } from '../../dialogs/create-payroll-cycle-dialog/create-payroll-cycle-dialog.component';
import { ProcessPayrollDialogComponent } from '../../dialogs/process-payroll-dialog/process-payroll-dialog.component';
import { FinalizePayrollDialogComponent } from '../../dialogs/finalize-payroll-dialog/finalize-payroll-dialog.component';

@Component({
  selector: 'app-payroll-cycles',
  templateUrl: './payroll-cycles.component.html',
  styleUrls: ['./payroll-cycles.component.scss']
})
export class PayrollCyclesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  displayedColumns: string[] = [
    'period',
    'status',
    'totalEmployees',
    'processedEmployees',
    'totalPayroll',
    'createdAt',
    'actions'
  ];
  
  dataSource = new MatTableDataSource<PayrollCycle>();
  isLoading = true;
  selectedCycle: PayrollCycle | null = null;

  constructor(
    private payrollService: PayrollOfficerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPayrollCycles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadPayrollCycles(): void {
    this.isLoading = true;
    
    this.payrollService.getPayrollCycles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cycles) => {
          this.dataSource.data = cycles;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading payroll cycles:', error);
          this.snackBar.open('Error loading payroll cycles', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  createNewCycle(): void {
    const dialogRef = this.dialog.open(CreatePayrollCycleDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPayrollCycles();
        this.snackBar.open('Payroll cycle created successfully', 'OK', { duration: 3000 });
      }
    });
  }

  processCycle(cycle: PayrollCycle): void {
    if (cycle.status !== 'draft') {
      this.snackBar.open('Only draft cycles can be processed', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ProcessPayrollDialogComponent, {
      width: '500px',
      data: { cycle }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPayrollCycles();
        this.snackBar.open('Payroll processing started', 'OK', { duration: 3000 });
      }
    });
  }

  finalizeCycle(cycle: PayrollCycle): void {
    if (cycle.status !== 'completed') {
      this.snackBar.open('Only completed cycles can be finalized', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(FinalizePayrollDialogComponent, {
      width: '500px',
      data: { cycle }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPayrollCycles();
        this.snackBar.open('Payroll cycle finalized successfully', 'OK', { duration: 3000 });
      }
    });
  }

  viewCycleDetails(cycle: PayrollCycle): void {
    this.selectedCycle = cycle;
    // Navigate to employee payroll with cycle filter
    // this.router.navigate(['/payroll-officer/employee-payroll'], { queryParams: { cycleId: cycle.id } });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'draft': return 'accent';
      case 'processing': return 'primary';
      case 'completed': return 'primary';
      case 'finalized': return 'warn';
      default: return 'primary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'draft': return 'edit';
      case 'processing': return 'autorenew';
      case 'completed': return 'check_circle';
      case 'finalized': return 'lock';
      default: return 'help';
    }
  }

  canProcess(cycle: PayrollCycle): boolean {
    return cycle.status === 'draft';
  }

  canFinalize(cycle: PayrollCycle): boolean {
    return cycle.status === 'completed';
  }

  refreshData(): void {
    this.loadPayrollCycles();
  }

  exportCycleData(cycle: PayrollCycle): void {
    // Implementation for exporting cycle data
    this.snackBar.open('Export functionality coming soon', 'OK', { duration: 2000 });
  }
}