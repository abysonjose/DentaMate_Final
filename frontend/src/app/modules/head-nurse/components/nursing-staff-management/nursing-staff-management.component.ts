import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { HeadNurseService, NursingStaff } from '../../services/head-nurse.service';
import { AssignNurseDialogComponent } from '../../dialogs/assign-nurse-dialog/assign-nurse-dialog.component';

@Component({
  selector: 'app-nursing-staff-management',
  templateUrl: './nursing-staff-management.component.html',
  styleUrls: ['./nursing-staff-management.component.scss']
})
export class NursingStaffManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  nursingStaff: NursingStaff[] = [];
  filteredStaff: NursingStaff[] = [];
  
  displayedColumns: string[] = ['name', 'role', 'status', 'currentAssignment', 'shift', 'workload', 'actions'];
  
  filterOptions = {
    role: 'all',
    status: 'all',
    searchTerm: ''
  };

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'on_duty', label: 'On Duty' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'break', label: 'On Break' },
    { value: 'off_duty', label: 'Off Duty' }
  ];

  roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'dental_assistant', label: 'Dental Assistant' }
  ];

  constructor(
    private headNurseService: HeadNurseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadNursingStaff();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNursingStaff(): void {
    this.headNurseService.getNursingStaff()
      .pipe(takeUntil(this.destroy$))
      .subscribe(staff => {
        this.nursingStaff = staff;
        this.applyFilters();
      });
  }

  private setupRealTimeUpdates(): void {
    this.headNurseService.nursingStaff$
      .pipe(takeUntil(this.destroy$))
      .subscribe(staff => {
        this.nursingStaff = staff;
        this.applyFilters();
      });
  }

  applyFilters(): void {
    this.filteredStaff = this.nursingStaff.filter(staff => {
      const matchesRole = this.filterOptions.role === 'all' || staff.role === this.filterOptions.role;
      const matchesStatus = this.filterOptions.status === 'all' || staff.status === this.filterOptions.status;
      const matchesSearch = !this.filterOptions.searchTerm || 
        staff.name.toLowerCase().includes(this.filterOptions.searchTerm.toLowerCase());
      
      return matchesRole && matchesStatus && matchesSearch;
    });
  }

  assignNurse(staff: NursingStaff): void {
    const dialogRef = this.dialog.open(AssignNurseDialogComponent, {
      width: '500px',
      data: { nurse: staff }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.headNurseService.assignNurseToDoctor(staff.id, result.doctorId, result.roomNumber)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Nurse assigned successfully', 'Close', { duration: 3000 });
              this.loadNursingStaff();
            },
            error: (error) => {
              this.snackBar.open('Failed to assign nurse', 'Close', { duration: 3000 });
            }
          });
      }
    });
  }

  updateStatus(staff: NursingStaff, newStatus: string): void {
    this.headNurseService.updateNurseStatus(staff.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Status updated successfully', 'Close', { duration: 3000 });
          this.loadNursingStaff();
        },
        error: (error) => {
          this.snackBar.open('Failed to update status', 'Close', { duration: 3000 });
        }
      });
  }

  getStatusColor(status: string): string {
    const colors = {
      'on_duty': 'primary',
      'assigned': 'accent',
      'break': 'warn',
      'off_duty': 'basic'
    };
    return colors[status] || 'basic';
  }

  getWorkloadColor(workload: number): string {
    if (workload >= 80) return 'warn';
    if (workload >= 60) return 'accent';
    return 'primary';
  }

  canAssign(staff: NursingStaff): boolean {
    return staff.status === 'on_duty' && !staff.currentAssignment;
  }

  canChangeStatus(staff: NursingStaff): boolean {
    return staff.status !== 'assigned'; // Cannot change status if currently assigned
  }

  refreshData(): void {
    this.loadNursingStaff();
  }
}