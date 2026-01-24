import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PharmacistService, PharmacyOverview, StockAlert, Prescription } from '../../services/pharmacist.service';
import { PrescriptionDetailsDialogComponent } from '../../dialogs/prescription-details-dialog/prescription-details-dialog.component';
import { StockRefillRequestDialogComponent } from '../../dialogs/stock-refill-request-dialog/stock-refill-request-dialog.component';

@Component({
  selector: 'app-pharmacist-dashboard',
  templateUrl: './pharmacist-dashboard.component.html',
  styleUrls: ['./pharmacist-dashboard.component.scss']
})
export class PharmacistDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  overview: PharmacyOverview = {
    pendingPrescriptions: 0,
    medicinesDispensed: 0,
    lowStockAlerts: 0,
    expiryAlerts: 0,
    todayRevenue: 0,
    pendingPayments: 0
  };

  criticalAlerts: StockAlert[] = [];
  recentPrescriptions: Prescription[] = [];
  isLoading = true;
  currentTime = new Date();

  // Chart data for analytics
  dispensingTrends: any[] = [];
  stockLevels: any[] = [];

  constructor(
    private pharmacistService: PharmacistService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    // Update current time every minute
    setInterval(() => {
      this.currentTime = new Date();
    }, 60000);
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.isLoading = true;

    forkJoin({
      overview: this.pharmacistService.getPharmacyOverview(),
      alerts: this.pharmacistService.getStockAlerts(),
      prescriptions: this.pharmacistService.getPendingPrescriptions()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.overview = data.overview;
        this.criticalAlerts = data.alerts.filter(alert => 
          alert.severity === 'critical' || alert.severity === 'high'
        ).slice(0, 5);
        this.recentPrescriptions = data.prescriptions.slice(0, 5);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.snackBar.open('Error loading dashboard data', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  viewPrescriptionDetails(prescription: Prescription): void {
    const dialogRef = this.dialog.open(PrescriptionDetailsDialogComponent, {
      width: '800px',
      data: { prescription }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'dispensed') {
        this.loadDashboardData();
      }
    });
  }

  requestStockRefill(alert: StockAlert): void {
    const dialogRef = this.dialog.open(StockRefillRequestDialogComponent, {
      width: '600px',
      data: { 
        medicineId: alert.medicineId,
        medicineName: alert.medicineName,
        currentStock: alert.currentStock
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.snackBar.open('Stock refill request submitted successfully', 'Close', { duration: 3000 });
        this.loadDashboardData();
      }
    });
  }

  acknowledgeAlert(alert: StockAlert): void {
    this.pharmacistService.acknowledgeAlert(alert.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Alert acknowledged', 'Close', { duration: 2000 });
          this.loadDashboardData();
        },
        error: (error) => {
          console.error('Error acknowledging alert:', error);
          this.snackBar.open('Error acknowledging alert', 'Close', { duration: 3000 });
        }
      });
  }

  getAlertIcon(alertType: string): string {
    switch (alertType) {
      case 'low_stock': return 'inventory_2';
      case 'out_of_stock': return 'remove_shopping_cart';
      case 'expiry_warning': return 'schedule';
      case 'expired': return 'dangerous';
      default: return 'warning';
    }
  }

  getAlertColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      default: return '';
    }
  }

  getPrescriptionStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'warn';
      case 'verified': return 'primary';
      case 'dispensed': return 'accent';
      default: return '';
    }
  }

  getPaymentStatusColor(status: string): string {
    switch (status) {
      case 'paid': return 'accent';
      case 'pending': return 'warn';
      case 'failed': return 'warn';
      default: return '';
    }
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  navigateToSection(section: string): void {
    // Navigation logic will be implemented based on routing structure
    console.log(`Navigate to ${section}`);
  }
}