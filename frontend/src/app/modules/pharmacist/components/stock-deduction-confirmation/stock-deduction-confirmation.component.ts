import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormControl } from '@angular/forms';

import { 
  PharmacistInventoryService, 
  StockDeductionRecord, 
  LowStockAlert 
} from '../../services/pharmacist-inventory.service';

@Component({
  selector: 'app-stock-deduction-confirmation',
  templateUrl: './stock-deduction-confirmation.component.html',
  styleUrls: ['./stock-deduction-confirmation.component.scss']
})
export class StockDeductionConfirmationComponent implements OnInit, OnDestroy {
  @ViewChild('deductionsPaginator') deductionsPaginator!: MatPaginator;
  @ViewChild('deductionsSort') deductionsSort!: MatSort;
  @ViewChild('alertsPaginator') alertsPaginator!: MatPaginator;
  @ViewChild('alertsSort') alertsSort!: MatSort;

  private destroy$ = new Subject<void>();

  // Stock Deductions
  deductionsDisplayedColumns: string[] = [
    'medicationName',
    'prescriptionId',
    'patientName',
    'quantityDeducted',
    'batchNumber',
    'totalValue',
    'deductedAt',
    'deductedBy'
  ];
  deductionsDataSource = new MatTableDataSource<StockDeductionRecord>();
  isLoadingDeductions = true;

  // Low Stock Alerts
  alertsDisplayedColumns: string[] = [
    'medicationName',
    'currentStock',
    'minimumStock',
    'severity',
    'alertDate',
    'actions'
  ];
  alertsDataSource = new MatTableDataSource<LowStockAlert>();
  isLoadingAlerts = true;

  error: string | null = null;

  // Filters
  dateFromControl = new FormControl();
  dateToControl = new FormControl();
  reasonFilter = new FormControl('all');

  reasonOptions = [
    { value: 'all', label: 'All Reasons' },
    { value: 'dispensed', label: 'Dispensed' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'expired', label: 'Expired' },
    { value: 'returned', label: 'Returned' },
    { value: 'adjustment', label: 'Adjustment' }
  ];

  constructor(
    private inventoryService: PharmacistInventoryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadStockDeductions();
    this.loadLowStockAlerts();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters(): void {
    // Date filters
    this.dateFromControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadStockDeductions());

    this.dateToControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadStockDeductions());

    // Reason filter
    this.reasonFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadStockDeductions());
  }

  private loadStockDeductions(): void {
    this.isLoadingDeductions = true;
    this.error = null;

    const filters: any = {};
    
    if (this.dateFromControl.value) {
      filters.dateFrom = this.dateFromControl.value.toISOString().split('T')[0];
    }
    
    if (this.dateToControl.value) {
      filters.dateTo = this.dateToControl.value.toISOString().split('T')[0];
    }
    
    if (this.reasonFilter.value && this.reasonFilter.value !== 'all') {
      filters.reason = this.reasonFilter.value;
    }

    this.inventoryService.getStockDeductionRecords(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (records) => {
          this.deductionsDataSource.data = records;
          this.deductionsDataSource.paginator = this.deductionsPaginator;
          this.deductionsDataSource.sort = this.deductionsSort;
          this.isLoadingDeductions = false;
        },
        error: (error) => {
          console.error('Error loading stock deductions:', error);
          this.error = 'Failed to load stock deduction records.';
          this.isLoadingDeductions = false;
        }
      });
  }

  private loadLowStockAlerts(): void {
    this.isLoadingAlerts = true;

    this.inventoryService.getLowStockAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          this.alertsDataSource.data = alerts;
          this.alertsDataSource.paginator = this.alertsPaginator;
          this.alertsDataSource.sort = this.alertsSort;
          this.isLoadingAlerts = false;
        },
        error: (error) => {
          console.error('Error loading low stock alerts:', error);
          this.error = 'Failed to load low stock alerts.';
          this.isLoadingAlerts = false;
        }
      });
  }

  acknowledgeAlert(alert: LowStockAlert): void {
    this.inventoryService.acknowledgeLowStockAlert(alert.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Alert acknowledged', 'Close', { duration: 2000 });
          this.loadLowStockAlerts();
        },
        error: (error) => {
          console.error('Error acknowledging alert:', error);
          this.snackBar.open('Error acknowledging alert', 'Close', { duration: 3000 });
        }
      });
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'out_of_stock':
        return 'warn';
      case 'critical':
        return 'warn';
      case 'low':
        return 'accent';
      default:
        return 'primary';
    }
  }

  getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'out_of_stock':
        return 'Out of Stock';
      case 'critical':
        return 'Critical';
      case 'low':
        return 'Low';
      default:
        return severity;
    }
  }

  getReasonColor(reason: string): string {
    switch (reason) {
      case 'dispensed':
        return 'primary';
      case 'damaged':
        return 'warn';
      case 'expired':
        return 'warn';
      case 'returned':
        return 'accent';
      case 'adjustment':
        return 'primary';
      default:
        return 'primary';
    }
  }

  getReasonLabel(reason: string): string {
    switch (reason) {
      case 'dispensed':
        return 'Dispensed';
      case 'damaged':
        return 'Damaged';
      case 'expired':
        return 'Expired';
      case 'returned':
        return 'Returned';
      case 'adjustment':
        return 'Adjustment';
      default:
        return reason;
    }
  }

  refreshData(): void {
    this.loadStockDeductions();
    this.loadLowStockAlerts();
  }

  clearFilters(): void {
    this.dateFromControl.setValue(null);
    this.dateToControl.setValue(null);
    this.reasonFilter.setValue('all');
  }

  exportDeductions(): void {
    // Implementation for exporting stock deductions
    console.log('Export stock deductions functionality');
  }

  getTotalDeductionValue(): number {
    return this.deductionsDataSource.data.reduce((total, record) => total + record.totalValue, 0);
  }

  getTotalQuantityDeducted(): number {
    return this.deductionsDataSource.data.reduce((total, record) => total + record.quantityDeducted, 0);
  }

  getUnacknowledgedAlertsCount(): number {
    return this.alertsDataSource.data.filter(alert => !alert.acknowledged).length;
  }

  getCriticalAlertsCount(): number {
    return this.alertsDataSource.data.filter(alert => 
      alert.severity === 'critical' || alert.severity === 'out_of_stock'
    ).length;
  }
}