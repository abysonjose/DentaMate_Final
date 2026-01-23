import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { NurseService, ShiftDetails, Doctor, TreatmentRoom, Patient } from '../../services/nurse.service';

@Component({
  selector: 'app-shift-overview',
  templateUrl: './shift-overview.component.html',
  styleUrls: ['./shift-overview.component.scss']
})
export class ShiftOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentShift: ShiftDetails | null = null;
  assignedPatients: Patient[] = [];
  notifications: any[] = [];
  isLoading = true;

  // Display columns for tables
  doctorColumns: string[] = ['name', 'specialization', 'room', 'status'];
  roomColumns: string[] = ['name', 'type', 'status'];
  patientColumns: string[] = ['name', 'tokenNumber', 'doctor', 'status', 'estimatedTime'];

  constructor(private nurseService: NurseService) {}

  ngOnInit(): void {
    this.loadShiftData();
    this.subscribeToUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadShiftData(): void {
    // Load current shift details
    this.nurseService.getCurrentShift()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shift) => {
          this.currentShift = shift;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading shift data:', error);
          this.isLoading = false;
        }
      });

    // Load assigned patients
    this.nurseService.getAssignedPatients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patients) => {
          this.assignedPatients = patients;
        },
        error: (error) => {
          console.error('Error loading patients:', error);
        }
      });

    // Load notifications
    this.nurseService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.notifications = notifications.filter(n => !n.read).slice(0, 5);
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
        }
      });
  }

  private subscribeToUpdates(): void {
    this.nurseService.currentShift$
      .pipe(takeUntil(this.destroy$))
      .subscribe(shift => {
        if (shift) {
          this.currentShift = shift;
        }
      });

    this.nurseService.patients$
      .pipe(takeUntil(this.destroy$))
      .subscribe(patients => {
        this.assignedPatients = patients;
      });
  }

  getDoctorByRoom(roomId: string): Doctor | undefined {
    return this.currentShift?.assignedDoctors.find(doctor => doctor.roomId === roomId);
  }

  getPatientsByDoctor(doctorId: string): Patient[] {
    return this.assignedPatients.filter(patient => patient.doctorId === doctorId);
  }

  getShiftDuration(): string {
    if (!this.currentShift) return '';
    
    const start = new Date(`2000-01-01 ${this.currentShift.startTime}`);
    const end = new Date(`2000-01-01 ${this.currentShift.endTime}`);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    return `${duration} hours`;
  }

  getShiftStatus(): string {
    if (!this.currentShift) return 'Unknown';
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const shiftDate = this.currentShift.date;
    
    if (shiftDate === today) {
      const currentTime = now.toTimeString().slice(0, 5);
      if (currentTime >= this.currentShift.startTime && currentTime <= this.currentShift.endTime) {
        return 'Active';
      } else if (currentTime < this.currentShift.startTime) {
        return 'Upcoming';
      } else {
        return 'Completed';
      }
    } else if (shiftDate > today) {
      return 'Scheduled';
    } else {
      return 'Completed';
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'available':
        return 'primary';
      case 'busy':
      case 'occupied':
        return 'warn';
      case 'break':
      case 'cleaning':
        return 'accent';
      case 'completed':
        return 'basic';
      default:
        return 'basic';
    }
  }

  getPriorityPatients(): Patient[] {
    return this.assignedPatients.filter(patient => 
      patient.status === 'waiting' && !patient.preparationStatus.patientReady
    ).slice(0, 3);
  }

  getUrgentNotifications(): any[] {
    return this.notifications.filter(n => n.priority === 'urgent' || n.priority === 'high');
  }

  markNotificationRead(notificationId: string): void {
    this.nurseService.markNotificationRead(notificationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.filter(n => n.id !== notificationId);
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  refreshData(): void {
    this.isLoading = true;
    this.loadShiftData();
  }

  formatTime(time: string): string {
    return new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  getTimeUntilShift(): string {
    if (!this.currentShift) return '';
    
    const now = new Date();
    const shiftStart = new Date(`${this.currentShift.date} ${this.currentShift.startTime}`);
    const diff = shiftStart.getTime() - now.getTime();
    
    if (diff <= 0) return 'Shift has started';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m until shift`;
  }
}