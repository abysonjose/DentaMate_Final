import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountsManagerService, BillingOversightData } from '../../services/accounts-manager.service';

@Component({
  selector: 'app-billing-oversight',
  templateUrl: './billing-oversight.component.html',
  styleUrls: ['./billing-oversight.component.scss']
})
export class BillingOversightComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  oversightData: BillingOversightData | null = null;
  isLoading = true;

  constructor(private accountsManagerService: AccountsManagerService) {}

  ngOnInit(): void {
    this.loadBillingOversightData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBillingOversightData(): void {
    this.isLoading = true;
    
    this.accountsManagerService.getBillingOversightData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.oversightData = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading billing oversight data:', error);
          this.isLoading = false;
        }
      });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'HIGH': return 'warn';
      case 'MEDIUM': return 'accent';
      case 'LOW': return 'primary';
      default: return '';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'warn';
      case 'APPROVED': return 'primary';
      case 'REJECTED': return 'accent';
      default: return '';
    }
  }
}