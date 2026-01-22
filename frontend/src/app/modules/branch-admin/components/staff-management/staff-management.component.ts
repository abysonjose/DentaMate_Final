import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';

import { BranchStaffService, BranchStaff, LeaveRequest } from '../../services/branch-staff.service';
import { AddStaffDialogComponent } from '../../dialogs/add-staff-dialog/add-staff-dialog.component';
import { EditStaffDialogComponent } from '../../dialogs/edit-staff-dialog/edit-staff-dialog.component';

@Component({
  selector: 'app-staff-management',
  templateUrl: './staff-management.component.html',
  styleUrls: ['./staff-management.component.scss']
})
export class StaffManagementComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'select',
    'name',
    'role',
    'department',
    'status',
    'lastLogin',
    'performance',
    'actions'
  ];

  dataSource = new MatTableDataSource<BranchStaff>();
  selection = new SelectionModel<BranchStaff>(true, []);
  
  isLoading = true;
  searchQuery = '';
  roleFilter = 'all';
  departmentFilter = 'all';
  statusFilter = 'all';

  roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'doctor-assistant', label: 'Doctor Assistant' },
    { value: 'receptionist', label: 'Receptionist' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'pharmacist', label: 'Pharmacist' },
    { value: 'lab-assistant', label: 'Lab Assistant' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'head-nurse', label: 'Head Nurse' }
  ];

  departmentOptions = [
    { value: 'all', label: 'All Departments' },
    { value: 'General Dentistry', label: 'General Dentistry' },
    { value: 'Orthodontics', label: 'Orthodontics' },
    { value: 'Oral Surgery', label: 'Oral Surgery' },
    { value: 'Pediatric Dentistry', label: 'Pediatric Dentistry' },
    { value: 'Administration', label: 'Administration' },
    { value: 'Laboratory', label: 'Laboratory' },
    { value: 'Pharmacy', label: 'Pharmacy' }
  ];

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  pendingLeaveRequests: LeaveRequest[] = [];

  constructor(
    private staffService: BranchStaffService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadStaff();
    this.loadPendingLeaveRequests();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadStaff(): void {
    this.isLoading = true;
    
    // Mock data for now - replace with real API call
    setTimeout(() => {
      const mockStaff: BranchStaff[] = [
        {
          id: '1',
          employeeId: 'EMP001',
          firstName: 'Dr. Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@dentamate.com',
          phone: '+1-555-0101',
          role: 'doctor',
          department: 'General Dentistry',
          specialization: 'General Dentistry',
          isActive: true,
          joinDate: new Date('2023-01-15'),
          lastLogin: new Date('2024-01-22T08:30:00'),
          workingHours: {
            monday: { start: '08:00', end: '17:00', isWorking: true },
            tuesday: { start: '08:00', end: '17:00', isWorking: true },
            wednesday: { start: '08:00', end: '17:00', isWorking: true },
            thursday: { start: '08:00', end: '17:00', isWorking: true },
            friday: { start: '08:00', end: '16:00', isWorking: true },
            saturday: { start: '00:00', end: '00:00', isWorking: false },
            sunday: { start: '00:00', end: '00:00', isWorking: false }
          },
          permissions: ['view_patients', 'create_prescriptions', 'manage_appointments'],
          qualifications: ['DDS', 'General Dentistry Certification'],
          experience: 8,
          emergencyContact: {
            name: 'John Johnson',
            phone: '+1-555-0102',
            relationship: 'Spouse'
          },
          address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001'
          },
          documents: [],
          performance: {
            rating: 4.8,
            lastReview: new Date('2023-12-15'),
            nextReview: new Date('2024-12-15')
          }
        },
        {
          id: '2',
          employeeId: 'EMP002',
          firstName: 'Emily',
          lastName: 'Davis',
          email: 'emily.davis@dentamate.com',
          phone: '+1-555-0103',
          role: 'receptionist',
          department: 'Administration',
          isActive: true,
          joinDate: new Date('2023-03-20'),
          lastLogin: new Date('2024-01-22T09:15:00'),
          workingHours: {
            monday: { start: '08:00', end: '17:00', isWorking: true },
            tuesday: { start: '08:00', end: '17:00', isWorking: true },
            wednesday: { start: '08:00', end: '17:00', isWorking: true },
            thursday: { start: '08:00', end: '17:00', isWorking: true },
            friday: { start: '08:00', end: '17:00', isWorking: true },
            saturday: { start: '09:00', end: '15:00', isWorking: true },
            sunday: { start: '00:00', end: '00:00', isWorking: false }
          },
          permissions: ['manage_appointments', 'patient_checkin', 'generate_tokens'],
          experience: 3,
          emergencyContact: {
            name: 'Michael Davis',
            phone: '+1-555-0104',
            relationship: 'Father'
          },
          address: {
            street: '456 Oak Ave',
            city: 'New York',
            state: 'NY',
            zipCode: '10002'
          },
          documents: [],
          performance: {
            rating: 4.5,
            lastReview: new Date('2023-11-20'),
            nextReview: new Date('2024-11-20')
          }
        },
        {
          id: '3',
          employeeId: 'EMP003',
          firstName: 'Dr. Michael',
          lastName: 'Chen',
          email: 'michael.chen@dentamate.com',
          phone: '+1-555-0105',
          role: 'doctor',
          department: 'Orthodontics',
          specialization: 'Orthodontics',
          isActive: false,
          joinDate: new Date('2022-08-10'),
          lastLogin: new Date('2024-01-20T14:20:00'),
          workingHours: {
            monday: { start: '09:00', end: '18:00', isWorking: true },
            tuesday: { start: '09:00', end: '18:00', isWorking: true },
            wednesday: { start: '09:00', end: '18:00', isWorking: true },
            thursday: { start: '09:00', end: '18:00', isWorking: true },
            friday: { start: '09:00', end: '17:00', isWorking: true },
            saturday: { start: '00:00', end: '00:00', isWorking: false },
            sunday: { start: '00:00', end: '00:00', isWorking: false }
          },
          permissions: ['view_patients', 'create_prescriptions', 'manage_appointments', 'orthodontic_procedures'],
          qualifications: ['DDS', 'Orthodontics Specialization'],
          experience: 12,
          emergencyContact: {
            name: 'Lisa Chen',
            phone: '+1-555-0106',
            relationship: 'Spouse'
          },
          address: {
            street: '789 Pine St',
            city: 'New York',
            state: 'NY',
            zipCode: '10003'
          },
          documents: [],
          performance: {
            rating: 4.9,
            lastReview: new Date('2023-10-10'),
            nextReview: new Date('2024-10-10')
          }
        }
      ];
      
      this.dataSource.data = mockStaff;
      this.isLoading = false;
    }, 1000);
  }

  loadPendingLeaveRequests(): void {
    // Mock data for pending leave requests
    this.pendingLeaveRequests = [
      {
        id: '1',
        staffId: '2',
        staffName: 'Emily Davis',
        leaveType: 'vacation',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-05'),
        days: 5,
        reason: 'Family vacation',
        status: 'pending',
        appliedDate: new Date('2024-01-20'),
        isEmergency: false
      },
      {
        id: '2',
        staffId: '1',
        staffName: 'Dr. Sarah Johnson',
        leaveType: 'sick',
        startDate: new Date('2024-01-25'),
        endDate: new Date('2024-01-26'),
        days: 2,
        reason: 'Medical appointment',
        status: 'pending',
        appliedDate: new Date('2024-01-22'),
        isEmergency: true
      }
    ];
  }

  applyFilter(): void {
    let filteredData = this.dataSource.data;

    // Search filter
    if (this.searchQuery) {
      filteredData = filteredData.filter(staff =>
        staff.firstName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        staff.lastName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        staff.email.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        staff.employeeId.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (this.roleFilter !== 'all') {
      filteredData = filteredData.filter(staff => staff.role === this.roleFilter);
    }

    // Department filter
    if (this.departmentFilter !== 'all') {
      filteredData = filteredData.filter(staff => staff.department === this.departmentFilter);
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      const isActive = this.statusFilter === 'active';
      filteredData = filteredData.filter(staff => staff.isActive === isActive);
    }

    this.dataSource.data = filteredData;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.roleFilter = 'all';
    this.departmentFilter = 'all';
    this.statusFilter = 'all';
    this.loadStaff();
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

  addStaff(): void {
    const dialogRef = this.dialog.open(AddStaffDialogComponent, {
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.staffService.createStaff(result).subscribe({
          next: () => {
            this.showSuccess('Staff member added successfully');
            this.loadStaff();
          },
          error: (error) => {
            this.showError('Failed to add staff member: ' + error.message);
          }
        });
      }
    });
  }

  editStaff(staff: BranchStaff): void {
    const dialogRef = this.dialog.open(EditStaffDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: staff
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.staffService.updateStaff(staff.id, result).subscribe({
          next: () => {
            this.showSuccess('Staff member updated successfully');
            this.loadStaff();
          },
          error: (error) => {
            this.showError('Failed to update staff member: ' + error.message);
          }
        });
      }
    });
  }

  toggleStaffStatus(staff: BranchStaff): void {
    const action = staff.isActive ? 'deactivate' : 'activate';
    const service = staff.isActive ? 
      this.staffService.deactivateStaff(staff.id) : 
      this.staffService.activateStaff(staff.id);

    service.subscribe({
      next: () => {
        staff.isActive = !staff.isActive;
        this.showSuccess(`Staff member ${action}d successfully`);
      },
      error: (error) => {
        this.showError(`Failed to ${action} staff member: ` + error.message);
      }
    });
  }

  viewStaffDetails(staff: BranchStaff): void {
    // TODO: Implement staff details view
    this.showInfo('Staff details view coming soon');
  }

  approveLeaveRequest(request: LeaveRequest): void {
    this.staffService.approveLeaveRequest(request.id).subscribe({
      next: () => {
        request.status = 'approved';
        this.showSuccess('Leave request approved');
      },
      error: (error) => {
        this.showError('Failed to approve leave request: ' + error.message);
      }
    });
  }

  rejectLeaveRequest(request: LeaveRequest): void {
    this.staffService.rejectLeaveRequest(request.id, 'Rejected by branch admin').subscribe({
      next: () => {
        request.status = 'rejected';
        this.showSuccess('Leave request rejected');
      },
      error: (error) => {
        this.showError('Failed to reject leave request: ' + error.message);
      }
    });
  }

  bulkAction(action: string): void {
    const selectedStaff = this.selection.selected;
    if (selectedStaff.length === 0) {
      this.showError('Please select staff members to perform bulk action');
      return;
    }

    const staffIds = selectedStaff.map(staff => staff.id);
    
    switch (action) {
      case 'activate':
        this.staffService.bulkUpdateStatus(staffIds, 'active').subscribe({
          next: () => {
            this.showSuccess(`${selectedStaff.length} staff members activated`);
            this.loadStaff();
            this.selection.clear();
          },
          error: (error) => this.showError('Bulk activation failed: ' + error.message)
        });
        break;
      case 'deactivate':
        this.staffService.bulkUpdateStatus(staffIds, 'inactive').subscribe({
          next: () => {
            this.showSuccess(`${selectedStaff.length} staff members deactivated`);
            this.loadStaff();
            this.selection.clear();
          },
          error: (error) => this.showError('Bulk deactivation failed: ' + error.message)
        });
        break;
    }
  }

  exportData(): void {
    this.staffService.exportStaffData('csv').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `staff-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.showSuccess('Staff data exported successfully');
      },
      error: (error) => {
        this.showError('Failed to export data: ' + error.message);
      }
    });
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'doctor': return 'primary';
      case 'nurse': return 'accent';
      case 'receptionist': return 'warn';
      default: return 'primary';
    }
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }

  getPerformanceColor(rating: number): string {
    if (rating >= 4.5) return 'primary';
    if (rating >= 4.0) return 'accent';
    if (rating >= 3.5) return 'warn';
    return 'warn';
  }

  getLeaveTypeColor(type: string): string {
    switch (type) {
      case 'sick': return 'warn';
      case 'emergency': return 'warn';
      case 'vacation': return 'primary';
      default: return 'accent';
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