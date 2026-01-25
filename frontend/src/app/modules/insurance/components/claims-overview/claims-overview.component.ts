import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { InsuranceService, ClaimStatus } from '../../services/insurance.service';
import { CreateClaimDialogComponent } from '../../dialogs/create-claim-dialog/create-claim-dialog.component';

@Component({
  selector: 'app-claims-overview',
  templateUrl: './claims-overview.component.html',
  styleUrls: ['./claims-overview.component.scss']
})
export class ClaimsOverviewComponent implements OnInit {
  dashboardStats: any = {};
  recentClaims: any[] = [];
  alerts: any[] = [];
  claimStatusDistribution: any[] = [];
  loading = true;

  // Quick stats cards
  statsCards = [
    {
      title: 'Claims Submitted Today',
      value: 0,
      icon: 'send',
      color: '#2196f3',
      trend: '+12%'
    },
    {
      title: 'Claims in Progress',
      value: 0,
      icon: 'hourglass_empty',
      color: '#ff9800',
      trend: '-5%'
    },
    {
      title: 'Approved Claims',
      value: 0,
      icon: 'check_circle',
      color: '#4caf50',
      trend: '+8%'
    },
    {
      title: 'Rejected Claims',
      value: 0,
      icon: 'cancel',
      color: '#f44336',
      trend: '+2%'
    }
  ];

  constructor(
    private insuranceService: InsuranceService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.loading = true;

    // Load dashboard statistics
    this.insuranceService.getDashboardStats().subscribe({
      next: (stats) => {
        this.dashboardStats = stats;
        this.updateStatsCards(stats);
      },
      error: (error) => console.error('Error loading dashboard stats:', error)
    });

    // Load recent claims
    this.insuranceService.getClaims({ limit: 10, sortBy: 'lastUpdated', sortOrder: 'desc' }).subscribe({
      next: (claims) => {
        this.recentClaims = claims;
      },
      error: (error) => console.error('Error loading recent claims:', error)
    });

    // Load claim status distribution
    this.insuranceService.getClaimStatusDistribution().subscribe({
      next: (distribution) => {
        this.claimStatusDistribution = distribution;
      },
      error: (error) => console.error('Error loading claim distribution:', error)
    });

    // Load recent activity and alerts
    this.insuranceService.getRecentActivity().subscribe({
      next: (activity) => {
        this.generateAlerts(activity);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading recent activity:', error);
        this.loading = false;
      }
    });
  }

  private updateStatsCards(stats: any): void {
    this.statsCards[0].value = stats.claimsSubmittedToday || 0;
    this.statsCards[1].value = stats.claimsInProgress || 0;
    this.statsCards[2].value = stats.approvedClaims || 0;
    this.statsCards[3].value = stats.rejectedClaims || 0;
  }

  private generateAlerts(activity: any): void {
    this.alerts = [];

    // Pending insurer response alerts
    if (activity.pendingInsurerResponse > 0) {
      this.alerts.push({
        type: 'warning',
        icon: 'schedule',
        title: 'Pending Insurer Response',
        message: `${activity.pendingInsurerResponse} claims awaiting insurer response`,
        action: 'View Claims',
        actionRoute: '/insurance/claim-tracking'
      });
    }

    // Missing documents alerts
    if (activity.missingDocuments > 0) {
      this.alerts.push({
        type: 'error',
        icon: 'folder_open',
        title: 'Missing Documents',
        message: `${activity.missingDocuments} claims have missing required documents`,
        action: 'Review Documents',
        actionRoute: '/insurance/documents'
      });
    }

    // Rejected claims requiring action
    if (activity.rejectedClaimsRequiringAction > 0) {
      this.alerts.push({
        type: 'error',
        icon: 'error_outline',
        title: 'Rejected Claims',
        message: `${activity.rejectedClaimsRequiringAction} rejected claims require immediate attention`,
        action: 'Review Rejections',
        actionRoute: '/insurance/claim-tracking'
      });
    }

    // Follow-up reminders
    if (activity.followUpReminders > 0) {
      this.alerts.push({
        type: 'info',
        icon: 'notification_important',
        title: 'Follow-up Reminders',
        message: `${activity.followUpReminders} claims require follow-up communication`,
        action: 'View Communications',
        actionRoute: '/insurance/communication'
      });
    }
  }

  openCreateClaimDialog(): void {
    const dialogRef = this.dialog.open(CreateClaimDialogComponent, {
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDashboardData(); // Refresh data
      }
    });
  }

  getClaimStatusColor(status: ClaimStatus): string {
    return this.insuranceService.getClaimStatusColor(status);
  }

  getClaimStatusIcon(status: ClaimStatus): string {
    return this.insuranceService.getClaimStatusIcon(status);
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  navigateToAlert(route: string): void {
    // Navigation logic will be handled by parent component
  }
}