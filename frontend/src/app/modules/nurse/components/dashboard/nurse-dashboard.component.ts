import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NurseService, ShiftDetails, Patient, QueueStatus, Task } from '../../services/nurse.service';

@Component({
  selector: 'app-nurse-dashboard',
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: ['./nurse-dashboard.component.scss']
})
export class NurseDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentShift: ShiftDetails | null = null;
  assignedPatients: Patient[] = [];
  queueStatus: QueueStatus[] = [];
  pendingTasks: Task[] = [];
  notifications: any[] = [];
  
  isLoading = true;
  selectedTabIndex = 0;
  
  navigationItems = [
    { label: 'Shift Overview', route: 'shift-overview', icon: 'schedule' },
    { label: 'Patient Preparation', route: 'patient-preparation', icon: 'person_add' },
    { label: 'Queue Status', route: 'queue-awareness', icon: 'queue' },
    { label: 'Chairside Assistance', route: 'chairmate-assistance', icon: 'medical_services' },
    { label: 'Nursing Notes', route: 'nursing-notes', icon: 'note_add' },
    { label: 'Medical Records', route: 'medical-records', icon: 'folder_shared' },
    { label: 'Supply Usage', route: 'supply-usage', icon: 'inventory' },
    { label: 'Sterilization', route: 'sterilization', icon: 'cleaning_services' },
    { label: 'Communication', route: 'communication', icon: 'chat' },
    { label: 'Tasks', route: 'tasks', icon: 'task_alt' }
  ];

  constructor(
    private nurseService: NurseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.subscribeToRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    // Load current shift
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

    // Load queue status
    this.nurseService.getQueueStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.queueStatus = status;
        },
        error: (error) => {
          console.error('Error loading queue status:', error);
        }
      });

    // Load pending tasks
    this.nurseService.getAssignedTasks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.pendingTasks = tasks.filter(task => task.status !== 'completed');
        },
        error: (error) => {
          console.error('Error loading tasks:', error);
        }
      });

    // Load notifications
    this.nurseService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.notifications = notifications.filter(n => !n.read);
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
        }
      });
  }

  private subscribeToRealTimeUpdates(): void {
    // Subscribe to real-time updates from WebSocket
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

    this.nurseService.queueStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.queueStatus = status;
      });

    this.nurseService.tasks$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => {
        this.pendingTasks = tasks.filter(task => task.status !== 'completed');
      });
  }

  navigateToSection(route: string): void {
    this.router.navigate(['/nurse', route]);
  }

  getUrgentTasksCount(): number {
    return this.pendingTasks.filter(task => task.priority === 'urgent').length;
  }

  getPatientsAwaitingPreparation(): number {
    return this.assignedPatients.filter(patient => 
      patient.status === 'waiting' && !patient.preparationStatus.patientReady
    ).length;
  }

  getUnreadNotificationsCount(): number {
    return this.notifications.length;
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  getShiftProgress(): number {
    if (!this.currentShift) return 0;
    
    const now = new Date();
    const shiftStart = new Date(`${this.currentShift.date} ${this.currentShift.startTime}`);
    const shiftEnd = new Date(`${this.currentShift.date} ${this.currentShift.endTime}`);
    
    const totalDuration = shiftEnd.getTime() - shiftStart.getTime();
    const elapsed = now.getTime() - shiftStart.getTime();
    
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  }

  refreshData(): void {
    this.isLoading = true;
    this.loadDashboardData();
  }
}