import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PharmacistService, PharmacistDashboardData } from '../../services/pharmacist.service';

@Component({
  selector: 'app-pharmacist-dashboard',
  templateUrl: './pharmacist-dashboard.component.html',
  styleUrls: ['./pharmacist-dashboard.component.scss']
})
export class PharmacistDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dashboardData: PharmacistDashboardData | null = null;
  isLoading = true;
  error: string | null = null;

  navigationItems = [
    {
      path: 'pending-prescriptions',
      label: 'Pending Prescriptions',
      icon: 'receipt_long',
      description: 'View and process pending prescriptions'
    },
    {
      path: 'dispense-medicines',
      label: 'Dispense Medicines',
      icon: 'medication',
      description: 'Dispense medicines to patients'
    },
    {
      path: 'stock-deduction-confirmation',
      label: 'Stock Deduction',
      icon: 'inventory_2',
      description: 'Confirm stock deductions and view low stock alerts'
    }
  ];

  constructor(
    private pharmacistService: PharmacistService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.error = null;

    this.pharmacistService.getDashboardData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          this.error = 'Failed to load dashboard data. Please try again.';
          this.isLoading = false;
        }
      });
  }

  navigateTo(path: string): void {
    this.router.navigate(['/pharmacist', path]);
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'prescription_dispensed':
        return 'medication';
      case 'stock_updated':
        return 'inventory';
      case 'low_stock_alert':
        return 'warning';
      default:
        return 'info';
    }
  }

  getActivityColor(type: string): string {
    switch (type) {
      case 'prescription_dispensed':
        return 'primary';
      case 'stock_updated':
        return 'accent';
      case 'low_stock_alert':
        return 'warn';
      default:
        return 'primary';
    }
  }
}