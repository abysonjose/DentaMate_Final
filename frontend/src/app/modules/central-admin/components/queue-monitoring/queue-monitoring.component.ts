import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { CentralAppointmentService } from '../../services/appointment.service';

interface ClinicQueueStatus {
  clinicId: string;
  clinicName: string;
  totalWaiting: number;
  averageWaitTime: number;
  doctorsActive: number;
  queueLoad: number;
  lastUpdated: Date;
  doctors: DoctorQueueStatus[];
}

interface DoctorQueueStatus {
  doctorId: string;
  doctorName: string;
  currentToken?: number;
  nextToken?: number;
  waiting: number;
  inProgress: number;
  completed: number;
  averageConsultationTime: number;
  estimatedWaitTime: number;
  status: 'active' | 'break' | 'offline';
}

@Component({
  selector: 'app-queue-monitoring',
  templateUrl: './queue-monitoring.component.html',
  styleUrls: ['./queue-monitoring.component.scss']
})
export class QueueMonitoringComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  clinicQueues: ClinicQueueStatus[] = [];
  isLoading = true;
  lastRefresh = new Date();
  autoRefresh = true;
  refreshInterval = 30; // seconds

  // Summary metrics
  totalWaitingPatients = 0;
  totalActiveConsultations = 0;
  averageSystemWaitTime = 0;
  systemLoad = 0;

  selectedClinic = '';
  clinics: any[] = [];

  constructor(
    private appointmentService: CentralAppointmentService
  ) {}

  ngOnInit(): void {
    this.loadQueueData();
    this.setupAutoRefresh();
    this.loadClinics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadQueueData(): void {
    this.isLoading = true;
    
    // Load system-wide metrics
    this.appointmentService.getSystemWideMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metrics) => {
          this.totalWaitingPatients = metrics.waitingPatients;
          this.totalActiveConsultations = metrics.inConsultation;
          this.averageSystemWaitTime = metrics.averageWaitTime;
          this.systemLoad = metrics.systemLoad;
          
          // Process queue status by clinic
          this.clinicQueues = metrics.queueStatus.map(clinic => ({
            clinicId: clinic.clinicId,
            clinicName: clinic.clinicName,
            totalWaiting: clinic.totalWaiting,
            averageWaitTime: clinic.averageWaitTime,
            doctorsActive: clinic.doctorsActive,
            queueLoad: Math.min(100, (clinic.totalWaiting / Math.max(1, clinic.doctorsActive * 5)) * 100),
            lastUpdated: new Date(),
            doctors: this.generateMockDoctorData(clinic.clinicId, clinic.doctorsActive)
          }));
          
          this.lastRefresh = new Date();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading queue data:', error);
          this.loadMockData();
          this.isLoading = false;
        }
      });
  }

  loadClinics(): void {
    // Mock clinic data
    this.clinics = [
      { id: 'clinic1', name: 'Main Clinic' },
      { id: 'clinic2', name: 'Branch Clinic A' },
      { id: 'clinic3', name: 'Branch Clinic B' }
    ];
  }

  setupAutoRefresh(): void {
    interval(this.refreshInterval * 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.autoRefresh) {
          this.loadQueueData();
        }
      });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
  }

  refreshNow(): void {
    this.loadQueueData();
  }

  getQueueLoadColor(load: number): string {
    if (load > 80) return 'warn';
    if (load > 60) return 'accent';
    return 'primary';
  }

  getQueueLoadIcon(load: number): string {
    if (load > 80) return 'error';
    if (load > 60) return 'warning';
    return 'check_circle';
  }

  getDoctorStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'break': return 'accent';
      case 'offline': return 'warn';
      default: return '';
    }
  }

  getDoctorStatusIcon(status: string): string {
    switch (status) {
      case 'active': return 'medical_services';
      case 'break': return 'coffee';
      case 'offline': return 'person_off';
      default: return 'person';
    }
  }

  getWaitTimeColor(waitTime: number): string {
    if (waitTime > 60) return 'warn';
    if (waitTime > 30) return 'accent';
    return 'primary';
  }

  filterByClinic(): void {
    this.loadQueueData();
  }

  clearClinicFilter(): void {
    this.selectedClinic = '';
    this.loadQueueData();
  }

  viewClinicDetails(clinic: ClinicQueueStatus): void {
    // Navigate to clinic-specific queue details
    console.log('View clinic details:', clinic);
  }

  manageDoctorQueue(doctor: DoctorQueueStatus): void {
    // Open doctor queue management
    console.log('Manage doctor queue:', doctor);
  }

  private generateMockDoctorData(clinicId: string, doctorCount: number): DoctorQueueStatus[] {
    const doctors: DoctorQueueStatus[] = [];
    
    for (let i = 1; i <= doctorCount; i++) {
      const waiting = Math.floor(Math.random() * 8) + 1;
      const inProgress = Math.random() > 0.7 ? 1 : 0;
      const completed = Math.floor(Math.random() * 15) + 5;
      
      doctors.push({
        doctorId: `${clinicId}-doc${i}`,
        doctorName: `Dr. Doctor ${i}`,
        currentToken: inProgress > 0 ? Math.floor(Math.random() * 50) + 1 : undefined,
        nextToken: waiting > 0 ? Math.floor(Math.random() * 50) + 10 : undefined,
        waiting,
        inProgress,
        completed,
        averageConsultationTime: Math.floor(Math.random() * 20) + 25,
        estimatedWaitTime: waiting * (Math.floor(Math.random() * 20) + 25),
        status: Math.random() > 0.8 ? 'break' : 'active'
      });
    }
    
    return doctors;
  }

  private loadMockData(): void {
    // Fallback mock data
    this.clinicQueues = [
      {
        clinicId: 'clinic1',
        clinicName: 'Main Clinic',
        totalWaiting: 25,
        averageWaitTime: 35,
        doctorsActive: 5,
        queueLoad: 75,
        lastUpdated: new Date(),
        doctors: this.generateMockDoctorData('clinic1', 5)
      },
      {
        clinicId: 'clinic2',
        clinicName: 'Branch Clinic A',
        totalWaiting: 18,
        averageWaitTime: 28,
        doctorsActive: 3,
        queueLoad: 60,
        lastUpdated: new Date(),
        doctors: this.generateMockDoctorData('clinic2', 3)
      },
      {
        clinicId: 'clinic3',
        clinicName: 'Branch Clinic B',
        totalWaiting: 12,
        averageWaitTime: 22,
        doctorsActive: 4,
        queueLoad: 45,
        lastUpdated: new Date(),
        doctors: this.generateMockDoctorData('clinic3', 4)
      }
    ];

    this.totalWaitingPatients = this.clinicQueues.reduce((sum, clinic) => sum + clinic.totalWaiting, 0);
    this.totalActiveConsultations = this.clinicQueues.reduce((sum, clinic) => 
      sum + clinic.doctors.reduce((docSum, doc) => docSum + doc.inProgress, 0), 0);
    this.averageSystemWaitTime = Math.round(
      this.clinicQueues.reduce((sum, clinic) => sum + clinic.averageWaitTime, 0) / this.clinicQueues.length
    );
    this.systemLoad = Math.round(
      this.clinicQueues.reduce((sum, clinic) => sum + clinic.queueLoad, 0) / this.clinicQueues.length
    );
  }
}