import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CentralAppointmentService } from '../../services/appointment.service';

interface ClinicCapacity {
  clinicId: string;
  clinicName: string;
  totalCapacity: number;
  currentUtilization: number;
  utilizationPercentage: number;
  availableSlots: number;
  bookedSlots: number;
  doctors: DoctorCapacity[];
  peakHours: TimeSlot[];
  recommendations: string[];
}

interface DoctorCapacity {
  doctorId: string;
  doctorName: string;
  specialty: string;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  utilizationRate: number;
  averageConsultationTime: number;
  nextAvailableSlot: Date | null;
  workingHours: string;
}

interface TimeSlot {
  hour: number;
  utilization: number;
  appointments: number;
}

@Component({
  selector: 'app-capacity-management',
  templateUrl: './capacity-management.component.html',
  styleUrls: ['./capacity-management.component.scss']
})
export class CapacityManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  clinicCapacities: ClinicCapacity[] = [];
  isLoading = true;
  selectedDate = new Date();
  selectedClinic = '';
  clinics: any[] = [];

  // Summary metrics
  totalSystemCapacity = 0;
  totalSystemUtilization = 0;
  averageUtilizationRate = 0;
  underutilizedClinics = 0;
  overutilizedClinics = 0;

  constructor(
    private appointmentService: CentralAppointmentService
  ) {}

  ngOnInit(): void {
    this.loadCapacityData();
    this.loadClinics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCapacityData(): void {
    this.isLoading = true;
    
    this.appointmentService.getCapacityMetrics(this.selectedDate, this.selectedClinic)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.processCapacityData(data);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading capacity data:', error);
          this.loadMockCapacityData();
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

  processCapacityData(data: any): void {
    this.clinicCapacities = data.clinics || [];
    this.totalSystemCapacity = data.totalCapacity || 0;
    this.totalSystemUtilization = data.totalUtilization || 0;
    this.averageUtilizationRate = data.averageUtilizationRate || 0;
    this.underutilizedClinics = data.underutilizedClinics || 0;
    this.overutilizedClinics = data.overutilizedClinics || 0;
  }

  onDateChange(): void {
    this.loadCapacityData();
  }

  onClinicChange(): void {
    this.loadCapacityData();
  }

  clearClinicFilter(): void {
    this.selectedClinic = '';
    this.loadCapacityData();
  }

  getUtilizationColor(rate: number): string {
    if (rate > 90) return 'warn';
    if (rate > 75) return 'accent';
    if (rate < 50) return 'primary';
    return 'primary';
  }

  getUtilizationIcon(rate: number): string {
    if (rate > 90) return 'warning';
    if (rate > 75) return 'trending_up';
    if (rate < 50) return 'trending_down';
    return 'trending_flat';
  }

  getCapacityStatus(rate: number): string {
    if (rate > 90) return 'Overutilized';
    if (rate > 75) return 'High Utilization';
    if (rate < 50) return 'Underutilized';
    return 'Optimal';
  }

  optimizeCapacity(clinic: ClinicCapacity): void {
    console.log('Optimize capacity for:', clinic);
    // Implementation for capacity optimization
  }

  viewDoctorSchedule(doctor: DoctorCapacity): void {
    console.log('View doctor schedule:', doctor);
    // Implementation for viewing doctor schedule
  }

  addCapacity(clinic: ClinicCapacity): void {
    console.log('Add capacity for:', clinic);
    // Implementation for adding capacity
  }

  private loadMockCapacityData(): void {
    this.clinicCapacities = [
      {
        clinicId: 'clinic1',
        clinicName: 'Main Clinic',
        totalCapacity: 120,
        currentUtilization: 95,
        utilizationPercentage: 79,
        availableSlots: 25,
        bookedSlots: 95,
        doctors: this.generateMockDoctorCapacity('clinic1', 6),
        peakHours: this.generateMockPeakHours(),
        recommendations: [
          'Consider adding evening slots',
          'Dr. Smith has high utilization - consider additional support',
          'Peak hours: 10-12 AM and 2-4 PM'
        ]
      },
      {
        clinicId: 'clinic2',
        clinicName: 'Branch Clinic A',
        totalCapacity: 80,
        currentUtilization: 45,
        utilizationPercentage: 56,
        availableSlots: 35,
        bookedSlots: 45,
        doctors: this.generateMockDoctorCapacity('clinic2', 4),
        peakHours: this.generateMockPeakHours(),
        recommendations: [
          'Underutilized - consider marketing campaigns',
          'Optimize doctor schedules',
          'Consider reducing capacity during low-demand hours'
        ]
      }
    ];

    this.totalSystemCapacity = this.clinicCapacities.reduce((sum, clinic) => sum + clinic.totalCapacity, 0);
    this.totalSystemUtilization = this.clinicCapacities.reduce((sum, clinic) => sum + clinic.currentUtilization, 0);
    this.averageUtilizationRate = Math.round(
      this.clinicCapacities.reduce((sum, clinic) => sum + clinic.utilizationPercentage, 0) / this.clinicCapacities.length
    );
    this.underutilizedClinics = this.clinicCapacities.filter(c => c.utilizationPercentage < 60).length;
    this.overutilizedClinics = this.clinicCapacities.filter(c => c.utilizationPercentage > 85).length;
  }

  private generateMockDoctorCapacity(clinicId: string, count: number): DoctorCapacity[] {
    const specialties = ['General Dentistry', 'Orthodontics', 'Oral Surgery', 'Pediatric Dentistry'];
    const doctors: DoctorCapacity[] = [];

    for (let i = 1; i <= count; i++) {
      const totalSlots = Math.floor(Math.random() * 16) + 8;
      const bookedSlots = Math.floor(Math.random() * totalSlots);
      
      doctors.push({
        doctorId: `${clinicId}-doc${i}`,
        doctorName: `Dr. Doctor ${i}`,
        specialty: specialties[Math.floor(Math.random() * specialties.length)],
        totalSlots,
        bookedSlots,
        availableSlots: totalSlots - bookedSlots,
        utilizationRate: Math.round((bookedSlots / totalSlots) * 100),
        averageConsultationTime: Math.floor(Math.random() * 20) + 25,
        nextAvailableSlot: Math.random() > 0.3 ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        workingHours: '9:00 AM - 5:00 PM'
      });
    }

    return doctors;
  }

  private generateMockPeakHours(): TimeSlot[] {
    const hours: TimeSlot[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      hours.push({
        hour,
        utilization: Math.floor(Math.random() * 100),
        appointments: Math.floor(Math.random() * 15)
      });
    }
    return hours;
  }
}