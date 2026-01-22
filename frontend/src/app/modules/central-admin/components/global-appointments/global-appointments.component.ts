import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { CentralAppointmentService, CentralAppointment } from '../../services/appointment.service';

@Component({
  selector: 'app-global-appointments',
  templateUrl: './global-appointments.component.html',
  styleUrls: ['./global-appointments.component.scss']
})
export class GlobalAppointmentsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  displayedColumns: string[] = [
    'appointmentDateTime',
    'patientName',
    'doctorName',
    'clinicName',
    'appointmentType',
    'status',
    'token',
    'actions'
  ];

  dataSource = new MatTableDataSource<CentralAppointment>();
  isLoading = true;
  totalAppointments = 0;

  // Filters
  selectedClinic = '';
  selectedStatus = '';
  selectedType = '';
  dateFilter = new Date();

  clinics: any[] = [];
  statuses = [
    { value: 'booked', label: 'Booked' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'checked_in', label: 'Checked In' },
    { value: 'in_consultation', label: 'In Consultation' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show', label: 'No Show' }
  ];

  appointmentTypes = [
    { value: 'consultation', label: 'Consultation' },
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'procedure', label: 'Procedure' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'walk_in', label: 'Walk-in' }
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private appointmentService: CentralAppointmentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAppointments();
    this.loadClinics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadAppointments(): void {
    this.isLoading = true;
    
    const filters = {
      startDate: this.getStartOfDay(this.dateFilter).toISOString(),
      endDate: this.getEndOfDay(this.dateFilter).toISOString(),
      clinicId: this.selectedClinic || undefined,
      status: this.selectedStatus || undefined,
      type: this.selectedType || undefined
    };

    this.appointmentService.getAllAppointments(0, 100, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.content || response;
          this.totalAppointments = response.totalElements || response.length;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading appointments:', error);
          this.snackBar.open('Error loading appointments', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  loadClinics(): void {
    // Mock clinic data - in real implementation, this would come from clinic service
    this.clinics = [
      { id: 'clinic1', name: 'Main Clinic' },
      { id: 'clinic2', name: 'Branch Clinic A' },
      { id: 'clinic3', name: 'Branch Clinic B' }
    ];
  }

  applyFilter(): void {
    this.loadAppointments();
  }

  clearFilters(): void {
    this.selectedClinic = '';
    this.selectedStatus = '';
    this.selectedType = '';
    this.dateFilter = new Date();
    this.loadAppointments();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'primary';
      case 'in_consultation': return 'accent';
      case 'confirmed': 
      case 'checked_in': return 'primary';
      case 'cancelled': 
      case 'no_show': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'booked': return 'event';
      case 'confirmed': return 'event_available';
      case 'checked_in': return 'how_to_reg';
      case 'in_consultation': return 'medical_services';
      case 'completed': return 'check_circle';
      case 'cancelled': return 'cancel';
      case 'no_show': return 'person_off';
      default: return 'event';
    }
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'emergency': return 'warn';
      case 'procedure': return 'accent';
      case 'walk_in': return 'primary';
      default: return '';
    }
  }

  viewAppointmentDetails(appointment: CentralAppointment): void {
    // Open appointment details dialog
    console.log('View appointment details:', appointment);
  }

  rescheduleAppointment(appointment: CentralAppointment): void {
    // Open reschedule dialog
    console.log('Reschedule appointment:', appointment);
  }

  cancelAppointment(appointment: CentralAppointment): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      // Implementation for cancellation
      console.log('Cancel appointment:', appointment);
    }
  }

  exportAppointments(): void {
    // Export appointments to CSV/Excel
    console.log('Export appointments');
    this.snackBar.open('Export functionality coming soon', 'Close', { duration: 3000 });
  }

  refreshData(): void {
    this.loadAppointments();
  }

  private getStartOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getEndOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}