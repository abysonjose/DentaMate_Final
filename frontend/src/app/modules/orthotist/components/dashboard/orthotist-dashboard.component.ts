import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { OrthotistService, OrthodonticCase } from '../../services/orthotist.service';

@Component({
  selector: 'app-orthotist-dashboard',
  templateUrl: './orthotist-dashboard.component.html',
  styleUrls: ['./orthotist-dashboard.component.scss']
})
export class OrthotistDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dashboardStats: any = {};
  todaysCases: OrthodonticCase[] = [];
  urgentCases: OrthodonticCase[] = [];
  overdueCases: OrthodonticCase[] = [];
  recentMessages: any[] = [];
  
  loading = true;
  
  // Quick stats
  totalActiveCases = 0;
  casesInFabrication = 0;
  casesReadyForDelivery = 0;
  overdueCount = 0;

  constructor(
    private orthotistService: OrthotistService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.loading = true;
    
    // Load dashboard statistics
    this.orthotistService.getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.dashboardStats = stats;
          this.updateQuickStats();
        },
        error: (error) => console.error('Error loading dashboard stats:', error)
      });

    // Load today's cases
    this.orthotistService.getCases()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cases) => {
          this.processCases(cases);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading cases:', error);
          this.loading = false;
        }
      });

    // Load recent messages
    this.orthotistService.getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.recentMessages = messages.slice(0, 5);
        },
        error: (error) => console.error('Error loading messages:', error)
      });
  }

  processCases(cases: OrthodonticCase[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.todaysCases = cases.filter(c => {
      const caseDate = new Date(c.createdDate);
      caseDate.setHours(0, 0, 0, 0);
      return caseDate.getTime() === today.getTime();
    });

    this.urgentCases = cases.filter(c => 
      c.priority === 'URGENT' && c.status !== 'DELIVERED'
    );

    this.overdueCases = cases.filter(c => {
      if (!c.estimatedDeliveryDate || c.status === 'DELIVERED') return false;
      return new Date(c.estimatedDeliveryDate) < new Date();
    });

    this.updateQuickStats();
  }

  updateQuickStats(): void {
    this.totalActiveCases = this.dashboardStats.totalActiveCases || 0;
    this.casesInFabrication = this.dashboardStats.casesInFabrication || 0;
    this.casesReadyForDelivery = this.dashboardStats.casesReadyForDelivery || 0;
    this.overdueCount = this.overdueCases.length;
  }

  navigateToSection(section: string): void {
    this.router.navigate(['/orthotist', section]);
  }

  viewCase(caseId: string): void {
    this.router.navigate(['/orthotist/cases'], { 
      queryParams: { caseId } 
    });
  }

  getStatusColor(status: string): string {
    return this.orthotistService.getCaseStatusColor(status);
  }

  getPriorityColor(priority: string): string {
    return this.orthotistService.getPriorityColor(priority);
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }
}