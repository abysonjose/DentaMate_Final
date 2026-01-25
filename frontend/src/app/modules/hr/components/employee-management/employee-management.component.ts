import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { Employee } from '../../services/hr.service';
import { EmployeeService, EmployeeFilter } from '../../services/employee.service';
import { AddEmployeeDialogComponent } from '../../dialogs/add-employee-dialog/add-employee-dialog.component';
import { EditEmployeeDialogComponent } from '../../dialogs/edit-employee-dialog/edit-employee-dialog.component';

@Component({
  selector: 'app-employee-management',
  templateUrl: './employee-management.component.html',
  styleUrls: ['./employee-management.component.scss']
})
export class EmployeeManagementComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();

  displayedColumns: string[] = [
    'select',
    'profilePicture',
    'employeeId',
    'name',
    'email',
    'role',
    'department',
    'branch',
    'status',
    'joiningDate',
    'actions'
  ];

  dataSource = new MatTableDataSource<Employee>();
  loading = false;
  totalEmployees = 0;
  currentPage = 0;
  pageSize = 10;

  // Filters
  searchControl = new FormControl('');
  roleFilter = new FormControl('');
  departmentFilter = new FormControl('');
  branchFilter = new FormControl('');
  statusFilter = new FormControl('');

  // Filter Options
  roles: string[] = [];
  departments: string[] = [];
  branches: any[] = [];
  statuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' }
  ];

  // Selection
  selectedEmployees: Employee[] = [];

  constructor(
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setupFilters();
    this.loadEmployees();
    this.loadFilterOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters(): void {
    // Search filter
    this.searchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 0;
        this.loadEmployees();
      });

    // Other filters
    [this.roleFilter, this.departmentFilter, this.branchFilter, this.statusFilter]
      .forEach(control => {
        control.valueChanges
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.currentPage = 0;
            this.loadEmployees();
          });
      });
  }

  private loadFilterOptions(): void {
    // Load roles
    this.employeeService.getEmployeesByRole('')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // This would typically come from a separate endpoint
          this.roles = ['Doctor', 'Nurse', 'Head Nurse', 'Receptionist', 'Lab Staff', 'Pharmacist', 'Support Staff'];
        }
      });

    // Load departments
    this.departments = ['Clinical', 'Administration', 'Laboratory', 'Pharmacy', 'Support'];

    // Load branches - this would come from a service
    this.branches = [
      { id: '1', name: 'Main Branch' },
      { id: '2', name: 'Downtown Branch' },
      { id: '3', name: 'Suburban Branch' }
    ];
  }

  private getFilter(): EmployeeFilter {
    return {
      search: this.searchControl.value || undefined,
      role: this.roleFilter.value || undefined,
      department: this.departmentFilter.value || undefined,
      branch: this.branchFilter.value || undefined,
      status: this.statusFilter.value || undefined,
      page: this.currentPage + 1,
      limit: this.pageSize,
      sortBy: this.sort?.active || 'name',
      sortOrder: this.sort?.direction || 'asc'
    };
  }

  loadEmployees(): void {
    this.loading = true;
    const filter = this.getFilter();

    this.employeeService.getEmployees(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.employees;
          this.totalEmployees = response.total;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading employees:', error);
          this.snackBar.open('Error loading employees', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEmployees();
  }

  onSortChange(): void {
    this.currentPage = 0;
    this.loadEmployees();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.roleFilter.setValue('');
    this.departmentFilter.setValue('');
    this.branchFilter.setValue('');
    this.statusFilter.setValue('');
  }

  addEmployee(): void {
    const dialogRef = this.dialog.open(AddEmployeeDialogComponent, {
      width: '600px',
      data: {
        roles: this.roles,
        departments: this.departments,
        branches: this.branches
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadEmployees();
        this.snackBar.open('Employee added successfully', 'Close', { duration: 3000 });
      }
    });
  }

  editEmployee(employee: Employee): void {
    const dialogRef = this.dialog.open(EditEmployeeDialogComponent, {
      width: '600px',
      data: {
        employee,
        roles: this.roles,
        departments: this.departments,
        branches: this.branches
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadEmployees();
        this.snackBar.open('Employee updated successfully', 'Close', { duration: 3000 });
      }
    });
  }

  toggleEmployeeStatus(employee: Employee): void {
    const action = employee.status === 'active' ? 'deactivate' : 'activate';
    const service = employee.status === 'active' 
      ? this.employeeService.deactivateEmployee(employee.id)
      : this.employeeService.activateEmployee(employee.id);

    service.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadEmployees();
          this.snackBar.open(`Employee ${action}d successfully`, 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error(`Error ${action}ing employee:`, error);
          this.snackBar.open(`Error ${action}ing employee`, 'Close', { duration: 3000 });
        }
      });
  }

  deleteEmployee(employee: Employee): void {
    if (confirm(`Are you sure you want to delete ${employee.name}?`)) {
      this.employeeService.deleteEmployee(employee.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadEmployees();
            this.snackBar.open('Employee deleted successfully', 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error deleting employee:', error);
            this.snackBar.open('Error deleting employee', 'Close', { duration: 3000 });
          }
        });
    }
  }

  isAllSelected(): boolean {
    const numSelected = this.selectedEmployees.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle(): void {
    this.isAllSelected() ?
      this.selectedEmployees = [] :
      this.selectedEmployees = [...this.dataSource.data];
  }

  toggleSelection(employee: Employee): void {
    const index = this.selectedEmployees.findIndex(e => e.id === employee.id);
    if (index > -1) {
      this.selectedEmployees.splice(index, 1);
    } else {
      this.selectedEmployees.push(employee);
    }
  }

  isSelected(employee: Employee): boolean {
    return this.selectedEmployees.some(e => e.id === employee.id);
  }

  bulkDeactivate(): void {
    if (this.selectedEmployees.length === 0) return;

    const employeeIds = this.selectedEmployees.map(e => e.id);
    this.employeeService.bulkDeactivateEmployees(employeeIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadEmployees();
          this.selectedEmployees = [];
          this.snackBar.open('Employees deactivated successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deactivating employees:', error);
          this.snackBar.open('Error deactivating employees', 'Close', { duration: 3000 });
        }
      });
  }

  exportEmployees(): void {
    // Implementation for exporting employee data
    console.log('Export employees functionality to be implemented');
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'inactive': return 'warn';
      case 'suspended': return 'accent';
      default: return '';
    }
  }
}