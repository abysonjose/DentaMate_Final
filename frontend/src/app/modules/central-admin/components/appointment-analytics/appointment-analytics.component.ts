import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CentralAppointmentService } from '../../services/appointment.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

interface AppointmentMetrics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  averageWaitTime: number;
  averageConsultationTime: number;
  patientSatisfactionScore: number;
}

interface TrendData {
  date: string;
  appointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

interface ClinicPerformance {
  clinicId: string;
  clinicName: string;
  metrics: AppointmentMetrics;
  trends: TrendData[];
  topDoctors: DoctorPerformance[];
}

interface DoctorPerformance {
  doctorId: string;
  doctorName: string;
  specialty: string;
  totalAppointments: number;
  completionRate: number;
  averageConsultationTime: number;
  patientRating: number;
  revenue: number;
}

@Component({
  selector: 'app-appointment-analytics',
  templateUrl: './appointment-analytics.component.html',
  styleUrls: ['./appointment-analytics.component.scss']
})
export class AppointmentAnalyticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = true;
  selectedPeriod = '30'; // days
  selectedClinic = '';
  clinics: any[] = [];

  // Overall metrics
  systemMetrics: AppointmentMetrics = {
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    noShowAppointments: 0,
    completionRate: 0,
    cancellationRate: 0,
    noShowRate: 0,
    averageWaitTime: 0,
    averageConsultationTime: 0,
    patientSatisfactionScore: 0
  };

  clinicPerformances: ClinicPerformance[] = [];

  // Chart configurations
  appointmentTrendsChart: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Appointment Trends'
        },
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };

  appointmentStatusChart: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Cancelled', 'No Show'],
      datasets: [{
        data: [],
        backgroundColor: ['#4caf50', '#ff9800', '#f44336']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Appointment Status Distribution'
        }
      }
    }
  };

  clinicComparisonChart: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Clinic Performance Comparison'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  };

  constructor(
    private appointmentService: CentralAppointmentService
  ) {}

  ngOnInit(): void {
    this.loadAnalyticsData();
    this.loadClinics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAnalyticsData(): void {
    this.isLoading = true;
    
    this.appointmentService.getAppointmentAnalytics(this.selectedPeriod, this.selectedClinic)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.processAnalyticsData(data);
          this.updateCharts();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading analytics data:', error);
          this.loadMockAnalyticsData();
          this.updateCharts();
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

  processAnalyticsData(data: any): void {
    this.systemMetrics = data.systemMetrics || this.systemMetrics;
    this.clinicPerformances = data.clinicPerformances || [];
  }

  onPeriodChange(): void {
    this.loadAnalyticsData();
  }

  onClinicChange(): void {
    this.loadAnalyticsData();
  }

  clearClinicFilter(): void {
    this.selectedClinic = '';
    this.loadAnalyticsData();
  }

  updateCharts(): void {
    this.updateAppointmentTrendsChart();
    this.updateAppointmentStatusChart();
    this.updateClinicComparisonChart();
  }

  updateAppointmentTrendsChart(): void {
    if (this.clinicPerformances.length > 0) {
      const sampleTrends = this.clinicPerformances[0].trends || [];
      
      this.appointmentTrendsChart.data.labels = sampleTrends.map(t => t.date);
      this.appointmentTrendsChart.data.datasets = [
        {
          label: 'Total Appointments',
          data: sampleTrends.map(t => t.appointments),
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          tension: 0.4
        },
        {
          label: 'Completed',
          data: sampleTrends.map(t => t.completed),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4
        },
        {
          label: 'Cancelled',
          data: sampleTrends.map(t => t.cancelled),
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          tension: 0.4
        }
      ];
    }
  }

  updateAppointmentStatusChart(): void {
    this.appointmentStatusChart.data.datasets[0].data = [
      this.systemMetrics.completedAppointments,
      this.systemMetrics.cancelledAppointments,
      this.systemMetrics.noShowAppointments
    ];
  }

  updateClinicComparisonChart(): void {
    this.clinicComparisonChart.data.labels = this.clinicPerformances.map(c => c.clinicName);
    this.clinicComparisonChart.data.datasets = [
      {
        label: 'Completion Rate (%)',
        data: this.clinicPerformances.map(c => c.metrics.completionRate),
        backgroundColor: '#4caf50'
      },
      {
        label: 'Cancellation Rate (%)',
        data: this.clinicPerformances.map(c => c.metrics.cancellationRate),
        backgroundColor: '#ff9800'
      },
      {
        label: 'No Show Rate (%)',
        data: this.clinicPerformances.map(c => c.metrics.noShowRate),
        backgroundColor: '#f44336'
      }
    ];
  }

  getMetricColor(value: number, type: 'completion' | 'cancellation' | 'noshow'): string {
    switch (type) {
      case 'completion':
        return value >= 90 ? 'primary' : value >= 80 ? 'accent' : 'warn';
      case 'cancellation':
      case 'noshow':
        return value <= 5 ? 'primary' : value <= 10 ? 'accent' : 'warn';
      default:
        return 'primary';
    }
  }

  getMetricIcon(value: number, type: 'completion' | 'cancellation' | 'noshow'): string {
    switch (type) {
      case 'completion':
        return value >= 90 ? 'trending_up' : value >= 80 ? 'trending_flat' : 'trending_down';
      case 'cancellation':
      case 'noshow':
        return value <= 5 ? 'trending_down' : value <= 10 ? 'trending_flat' : 'trending_up';
      default:
        return 'trending_flat';
    }
  }

  exportReport(): void {
    console.log('Export analytics report');
    // Implementation for exporting report
  }

  viewClinicDetails(clinic: ClinicPerformance): void {
    console.log('View clinic details:', clinic);
    // Implementation for viewing clinic details
  }

  viewDoctorPerformance(doctor: DoctorPerformance): void {
    console.log('View doctor performance:', doctor);
    // Implementation for viewing doctor performance
  }

  private loadMockAnalyticsData(): void {
    this.systemMetrics = {
      totalAppointments: 2450,
      completedAppointments: 2156,
      cancelledAppointments: 196,
      noShowAppointments: 98,
      completionRate: 88,
      cancellationRate: 8,
      noShowRate: 4,
      averageWaitTime: 25,
      averageConsultationTime: 35,
      patientSatisfactionScore: 4.2
    };

    this.clinicPerformances = [
      {
        clinicId: 'clinic1',
        clinicName: 'Main Clinic',
        metrics: {
          totalAppointments: 1200,
          completedAppointments: 1080,
          cancelledAppointments: 84,
          noShowAppointments: 36,
          completionRate: 90,
          cancellationRate: 7,
          noShowRate: 3,
          averageWaitTime: 22,
          averageConsultationTime: 38,
          patientSatisfactionScore: 4.5
        },
        trends: this.generateMockTrendData(),
        topDoctors: this.generateMockDoctorPerformance('clinic1', 5)
      },
      {
        clinicId: 'clinic2',
        clinicName: 'Branch Clinic A',
        metrics: {
          totalAppointments: 800,
          completedAppointments: 696,
          cancelledAppointments: 72,
          noShowAppointments: 32,
          completionRate: 87,
          cancellationRate: 9,
          noShowRate: 4,
          averageWaitTime: 28,
          averageConsultationTime: 32,
          patientSatisfactionScore: 4.1
        },
        trends: this.generateMockTrendData(),
        topDoctors: this.generateMockDoctorPerformance('clinic2', 3)
      }
    ];
  }

  private generateMockTrendData(): TrendData[] {
    const trends: TrendData[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const appointments = Math.floor(Math.random() * 50) + 30;
      const completed = Math.floor(appointments * (0.85 + Math.random() * 0.1));
      const cancelled = Math.floor((appointments - completed) * 0.7);
      const noShow = appointments - completed - cancelled;
      
      trends.push({
        date: date.toISOString().split('T')[0],
        appointments,
        completed,
        cancelled,
        noShow
      });
    }
    
    return trends;
  }

  private generateMockDoctorPerformance(clinicId: string, count: number): DoctorPerformance[] {
    const specialties = ['General Dentistry', 'Orthodontics', 'Oral Surgery', 'Pediatric Dentistry'];
    const doctors: DoctorPerformance[] = [];

    for (let i = 1; i <= count; i++) {
      const totalAppointments = Math.floor(Math.random() * 200) + 100;
      const completionRate = Math.floor(Math.random() * 20) + 80;
      
      doctors.push({
        doctorId: `${clinicId}-doc${i}`,
        doctorName: `Dr. Doctor ${i}`,
        specialty: specialties[Math.floor(Math.random() * specialties.length)],
        totalAppointments,
        completionRate,
        averageConsultationTime: Math.floor(Math.random() * 20) + 25,
        patientRating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
        revenue: Math.floor(Math.random() * 50000) + 25000
      });
    }

    return doctors.sort((a, b) => b.revenue - a.revenue);
  }
}