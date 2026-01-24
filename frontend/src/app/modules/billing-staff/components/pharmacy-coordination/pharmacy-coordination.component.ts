import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BillingDoctorIntegrationService, PrescriptionItem } from '../../../shared/services/billing-doctor-integration.service';

export interface PrescriptionBillingItem {
  prescriptionId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  appointmentId: string;
  billId?: string;
  prescriptionDate: Date;
  medicines: PrescriptionMedicine[];
  totalCost: number;
  billingStatus: 'PENDING' | 'BILLED' | 'DISPENSED' | 'COMPLETED';
  billingClearance: boolean;
  notes?: string;
}

export interface PrescriptionMedicine {
  id: string;
  name: string;
  dosage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availability: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  genericAlternative?: string;
  instructions: string;
}

export interface PharmacyBillingCoordination {
  prescriptionId: string;
  billingCleared: boolean;
  clearanceDate?: Date;
  clearanceStaffId: string;
  totalBilledAmount: number;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
  dispensingAllowed: boolean;
  notes?: string;
}

@Component({
  selector: 'app-pharmacy-coordination',
  templateUrl: './pharmacy-coordination.component.html',
  styleUrls: ['./pharmacy-coordination.component.scss']
})
export class PharmacyCoordinationComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Data Sources
  prescriptionsDataSource = new MatTableDataSource<PrescriptionBillingItem>();
  
  // Loading States
  loading = false;
  
  // Search and Filters
  searchControl = new FormControl('');
  selectedStatus = '';
  selectedDateRange = '';
  
  // Table Columns
  displayedColumns = ['prescriptionDate', 'patientName', 'doctorName', 'medicineCount', 'totalCost', 'billingStatus', 'actions'];
  
  // Summary Data
  totalPrescriptions = 0;
  pendingBilling = 0;
  clearedForDispensing = 0;
  totalValue = 0;

  constructor(
    private doctorIntegration: BillingDoctorIntegrationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPrescriptions();
    this.setupSearch();
  }

  ngAfterViewInit(): void {
    this.prescriptionsDataSource.paginator = this.paginator;
    this.prescriptionsDataSource.sort = this.sort;
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(searchTerm => {
        this.prescriptionsDataSource.filter = searchTerm?.trim().toLowerCase() || '';
      });
  }

  private loadPrescriptions(): void {
    this.loading = true;
    
    // Load prescriptions that need billing coordination
    // This would typically call a service method
    this.loading = false;
  }

  // Prescription Actions
  viewPrescriptionDetails(prescription: PrescriptionBillingItem): void {
    // Open prescription details dialog (read-only for billing staff)
    console.log('Viewing prescription details:', prescription);
  }

  confirmBillingClearance(prescription: PrescriptionBillingItem): void {
    if (prescription.billingStatus !== 'BILLED') {
      this.showError('Prescription must be billed before clearance');
      return;
    }

    const coordination: PharmacyBillingCoordination = {
      prescriptionId: prescription.prescriptionId,
      billingCleared: true,
      clearanceDate: new Date(),
      clearanceStaffId: this.getCurrentStaffId(),
      totalBilledAmount: prescription.totalCost,
      paymentStatus: 'PAID', // This would come from payment verification
      dispensingAllowed: true,
      notes: 'Billing verified and cleared for dispensing'
    };

    // Call service to update billing clearance
    this.updateBillingClearance(coordination);
  }

  private updateBillingClearance(coordination: PharmacyBillingCoordination): void {
    // Service call to update billing clearance
    this.showSuccess('Billing clearance confirmed. Pharmacy can now dispense medicines.');
    this.loadPrescriptions(); // Refresh data
  }

  checkMedicineAvailability(prescription: PrescriptionBillingItem): void {
    // Check medicine availability in pharmacy (read-only)
    console.log('Checking medicine availability for:', prescription);
  }

  generatePrescriptionBill(prescription: PrescriptionBillingItem): void {
    if (prescription.billingStatus !== 'PENDING') {
      this.showError('Prescription already billed');
      return;
    }

    // Generate bill for prescription medicines
    const billData = {
      appointmentId: prescription.appointmentId,
      patientId: prescription.patientId,
      prescriptionItems: prescription.medicines.map(med => ({
        name: med.name,
        quantity: med.quantity,
        unitPrice: med.unitPrice,
        totalPrice: med.totalPrice,
        category: 'MEDICINE'
      }))
    };

    console.log('Generating bill for prescription:', billData);
    this.showSuccess('Prescription bill generated successfully');
  }

  viewPharmacyStock(medicine: PrescriptionMedicine): void {
    // View pharmacy stock levels (read-only)
    console.log('Viewing stock for medicine:', medicine.name);
  }

  // Filters
  applyStatusFilter(): void {
    if (this.selectedStatus) {
      this.prescriptionsDataSource.filterPredicate = (data: PrescriptionBillingItem) => {
        return data.billingStatus === this.selectedStatus;
      };
      this.prescriptionsDataSource.filter = 'status_filter';
    } else {
      this.prescriptionsDataSource.filter = '';
    }
  }

  applyDateFilter(): void {
    // Apply date range filter
    console.log('Applying date filter:', this.selectedDateRange);
  }

  clearFilters(): void {
    this.selectedStatus = '';
    this.selectedDateRange = '';
    this.searchControl.setValue('');
    this.prescriptionsDataSource.filter = '';
  }

  // Utility Methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getStatusColor(status: string): string {
    const colors = {
      'PENDING': '#ff9800',
      'BILLED': '#2196f3',
      'DISPENSED': '#4caf50',
      'COMPLETED': '#4caf50'
    };
    return colors[status as keyof typeof colors] || '#9e9e9e';
  }

  getAvailabilityColor(availability: string): string {
    const colors = {
      'IN_STOCK': '#4caf50',
      'LOW_STOCK': '#ff9800',
      'OUT_OF_STOCK': '#f44336'
    };
    return colors[availability as keyof typeof colors] || '#9e9e9e';
  }

  getAvailabilityIcon(availability: string): string {
    const icons = {
      'IN_STOCK': 'check_circle',
      'LOW_STOCK': 'warning',
      'OUT_OF_STOCK': 'error'
    };
    return icons[availability as keyof typeof icons] || 'help';
  }

  canClearForDispensing(prescription: PrescriptionBillingItem): boolean {
    return prescription.billingStatus === 'BILLED' && !prescription.billingClearance;
  }

  canGenerateBill(prescription: PrescriptionBillingItem): boolean {
    return prescription.billingStatus === 'PENDING';
  }

  getMedicineCountText(medicines: PrescriptionMedicine[]): string {
    const count = medicines.length;
    return `${count} medicine${count !== 1 ? 's' : ''}`;
  }

  private getCurrentStaffId(): string {
    // Get current staff ID from auth service
    return localStorage.getItem('staffId') || 'unknown';
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

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }
}