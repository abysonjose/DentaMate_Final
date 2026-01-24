import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { BillingPatientIntegrationService, PatientBillingProfile, BillingHistoryItem } from '../../../shared/services/billing-patient-integration.service';

@Component({
  selector: 'app-patient-billing-history',
  templateUrl: './patient-billing-history.component.html',
  styleUrls: ['./patient-billing-history.component.scss']
})
export class PatientBillingHistoryComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Data Sources
  patientsDataSource = new MatTableDataSource<PatientBillingProfile>();
  billingHistoryDataSource = new MatTableDataSource<BillingHistoryItem>();
  
  // Loading States
  loadingPatients = false;
  loadingHistory = false;
  
  // Search and Filters
  patientSearchControl = new FormControl('');
  selectedPatient: PatientBillingProfile | null = null;
  selectedStatus = '';
  selectedDateRange = '';
  
  // Table Columns
  patientColumns = ['patientName', 'phone', 'email', 'outstandingAmount', 'lastBillDate', 'actions'];
  historyColumns = ['billNumber', 'treatmentDate', 'doctorName', 'services', 'totalAmount', 'status', 'actions'];
  
  // Summary Data
  totalOutstanding = 0;
  totalPaid = 0;
  totalBills = 0;

  constructor(
    private patientIntegration: BillingPatientIntegrationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadPatients();
  }

  ngAfterViewInit(): void {
    this.patientsDataSource.paginator = this.paginator;
    this.patientsDataSource.sort = this.sort;
    this.billingHistoryDataSource.paginator = this.paginator;
    this.billingHistoryDataSource.sort = this.sort;
  }

  private setupSearch(): void {
    this.patientSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(searchTerm => {
          if (searchTerm && searchTerm.length >= 2) {
            return this.searchPatients(searchTerm);
          }
          return [];
        })
      )
      .subscribe(patients => {
        this.patientsDataSource.data = patients;
      });
  }

  private loadPatients(): void {
    this.loadingPatients = true;
    // Load recent patients with billing activity
    this.loadingPatients = false;
  }

  private searchPatients(searchTerm: string): any {
    // Implementation would search patients by name, phone, or ID
    return [];
  }

  // Patient Selection
  selectPatient(patient: PatientBillingProfile): void {
    this.selectedPatient = patient;
    this.loadPatientBillingHistory(patient.patientId);
  }

  private loadPatientBillingHistory(patientId: string): void {
    this.loadingHistory = true;
    
    this.patientIntegration.getPatientBillingHistory(patientId).subscribe({
      next: (history) => {
        this.billingHistoryDataSource.data = history;
        this.calculateSummary(history);
        this.loadingHistory = false;
      },
      error: (error) => {
        console.error('Error loading patient billing history:', error);
        this.showError('Failed to load billing history');
        this.loadingHistory = false;
      }
    });
  }

  private calculateSummary(history: BillingHistoryItem[]): void {
    this.totalBills = history.length;
    this.totalOutstanding = history.reduce((sum, item) => sum + item.outstandingAmount, 0);
    this.totalPaid = history.reduce((sum, item) => sum + item.paidAmount, 0);
  }

  // Actions
  viewBillDetails(bill: BillingHistoryItem): void {
    // Open bill details dialog
    console.log('Viewing bill details:', bill);
  }

  processPayment(bill: BillingHistoryItem): void {
    if (bill.outstandingAmount <= 0) {
      this.showError('No outstanding amount for this bill');
      return;
    }
    
    // Open payment processing dialog
    console.log('Processing payment for bill:', bill);
  }

  sendPaymentReminder(bill: BillingHistoryItem): void {
    if (!this.selectedPatient) return;

    this.patientIntegration.schedulePaymentReminder(
      this.selectedPatient.patientId,
      bill.billId,
      {
        type: 'IMMEDIATE',
        channels: ['EMAIL', 'SMS']
      }
    ).subscribe({
      next: () => {
        this.showSuccess('Payment reminder sent successfully');
      },
      error: (error) => {
        console.error('Error sending reminder:', error);
        this.showError('Failed to send payment reminder');
      }
    });
  }

  generateStatement(): void {
    if (!this.selectedPatient) return;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // Last 3 months

    this.patientIntegration.getPatientBillingStatement(
      this.selectedPatient.patientId,
      startDate,
      endDate
    ).subscribe({
      next: (statement) => {
        // Generate and download statement
        this.showSuccess('Billing statement generated');
      },
      error: (error) => {
        console.error('Error generating statement:', error);
        this.showError('Failed to generate billing statement');
      }
    });
  }

  setupInstallmentPlan(bill: BillingHistoryItem): void {
    if (!this.selectedPatient || bill.outstandingAmount < 1000) {
      this.showError('Minimum amount of ₹1000 required for installment plan');
      return;
    }

    // Open installment setup dialog
    console.log('Setting up installment plan for bill:', bill);
  }

  // Filters
  applyStatusFilter(): void {
    if (this.selectedStatus) {
      this.billingHistoryDataSource.filterPredicate = (data: BillingHistoryItem) => {
        return data.status === this.selectedStatus;
      };
      this.billingHistoryDataSource.filter = 'status_filter';
    } else {
      this.billingHistoryDataSource.filter = '';
    }
  }

  applyDateFilter(): void {
    // Apply date range filter
    console.log('Applying date filter:', this.selectedDateRange);
  }

  clearFilters(): void {
    this.selectedStatus = '';
    this.selectedDateRange = '';
    this.billingHistoryDataSource.filter = '';
  }

  // Utility Methods
  formatCurrency(amount: number): string {
    return this.patientIntegration.formatCurrency(amount);
  }

  getStatusColor(status: string): string {
    return this.patientIntegration.getPaymentStatusColor(status);
  }

  getDaysOverdue(dueDate: Date): number {
    return this.patientIntegration.getDaysOverdue(dueDate);
  }

  formatServices(services: string[]): string {
    return services.length > 2 
      ? `${services.slice(0, 2).join(', ')} +${services.length - 2} more`
      : services.join(', ');
  }

  // Snackbar Messages
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}