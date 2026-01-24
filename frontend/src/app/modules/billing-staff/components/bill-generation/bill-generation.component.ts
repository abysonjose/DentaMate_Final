import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { 
  BillGenerationService, 
  AppointmentDetails, 
  GeneratedBill 
} from '../../services/bill-generation.service';
import { GenerateBillDialogComponent } from '../../dialogs/generate-bill-dialog/generate-bill-dialog.component';

@Component({
  selector: 'app-bill-generation',
  templateUrl: './bill-generation.component.html',
  styleUrls: ['./bill-generation.component.scss']
})
export class BillGenerationComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Data Sources
  appointmentsDataSource = new MatTableDataSource<AppointmentDetails>();
  billsDataSource = new MatTableDataSource<GeneratedBill>();
  
  // Loading States
  loadingAppointments = false;
  loadingBills = false;
  
  // Search Controls
  appointmentSearchControl = new FormControl('');
  billSearchControl = new FormControl('');
  
  // Table Columns
  appointmentColumns = ['appointmentDate', 'patientName', 'doctorName', 'treatmentType', 'consultationFee', 'actions'];
  billColumns = ['billNumber', 'patientName', 'totalAmount', 'status', 'createdDate', 'actions'];
  
  // Filters
  selectedStatus = '';
  selectedDateRange = '';
  
  constructor(
    private billService: BillGenerationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupSearch();
  }

  ngAfterViewInit(): void {
    this.appointmentsDataSource.paginator = this.paginator;
    this.appointmentsDataSource.sort = this.sort;
    this.billsDataSource.paginator = this.paginator;
    this.billsDataSource.sort = this.sort;
  }

  private loadData(): void {
    this.loadCompletedAppointments();
    this.loadRecentBills();
  }

  private loadCompletedAppointments(): void {
    this.loadingAppointments = true;
    this.billService.getCompletedAppointments().subscribe({
      next: (appointments) => {
        this.appointmentsDataSource.data = appointments.filter(apt => apt.status === 'COMPLETED');
        this.loadingAppointments = false;
      },
      error: (error) => {
        console.error('Error loading appointments:', error);
        this.showError('Failed to load appointments');
        this.loadingAppointments = false;
      }
    });
  }

  private loadRecentBills(): void {
    this.loadingBills = true;
    // This would typically call a service method to get recent bills
    // For now, we'll use a placeholder
    this.loadingBills = false;
  }

  private setupSearch(): void {
    // Appointment search
    this.appointmentSearchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(searchTerm => {
        this.appointmentsDataSource.filter = searchTerm?.trim().toLowerCase() || '';
      });

    // Bill search
    this.billSearchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(searchTerm => {
        this.billsDataSource.filter = searchTerm?.trim().toLowerCase() || '';
      });
  }

  // Appointment Actions
  generateBillForAppointment(appointment: AppointmentDetails): void {
    const dialogRef = this.dialog.open(GenerateBillDialogComponent, {
      width: '900px',
      data: { appointment },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSuccess('Bill generated successfully');
        this.loadData(); // Refresh data
      }
    });
  }

  viewAppointmentDetails(appointment: AppointmentDetails): void {
    // Navigate to appointment details or open dialog
    console.log('Viewing appointment details:', appointment);
  }

  // Bill Actions
  viewBillDetails(bill: GeneratedBill): void {
    // Navigate to bill details or open dialog
    console.log('Viewing bill details:', bill);
  }

  editBillDraft(bill: GeneratedBill): void {
    if (bill.status !== 'DRAFT') {
      this.showError('Only draft bills can be edited');
      return;
    }
    
    const dialogRef = this.dialog.open(GenerateBillDialogComponent, {
      width: '900px',
      data: { bill, mode: 'edit' },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSuccess('Bill updated successfully');
        this.loadData();
      }
    });
  }

  printBill(bill: GeneratedBill): void {
    // Print bill functionality
    this.showInfo(`Printing bill ${bill.billNumber}`);
  }

  deleteBillDraft(bill: GeneratedBill): void {
    if (bill.status !== 'DRAFT') {
      this.showError('Only draft bills can be deleted');
      return;
    }

    if (confirm('Are you sure you want to delete this draft bill?')) {
      // Call delete service
      this.showSuccess('Bill draft deleted');
      this.loadData();
    }
  }

  // Filters
  applyStatusFilter(): void {
    // Apply status filter to bills
    if (this.selectedStatus) {
      this.billsDataSource.filterPredicate = (data: GeneratedBill, filter: string) => {
        return data.status === this.selectedStatus;
      };
      this.billsDataSource.filter = 'status_filter';
    } else {
      this.billsDataSource.filterPredicate = (data: GeneratedBill, filter: string) => {
        return data.patientName.toLowerCase().includes(filter) ||
               data.billNumber.toLowerCase().includes(filter);
      };
      this.billsDataSource.filter = '';
    }
  }

  applyDateFilter(): void {
    // Apply date range filter
    console.log('Applying date filter:', this.selectedDateRange);
  }

  clearFilters(): void {
    this.selectedStatus = '';
    this.selectedDateRange = '';
    this.appointmentSearchControl.setValue('');
    this.billSearchControl.setValue('');
    this.appointmentsDataSource.filter = '';
    this.billsDataSource.filter = '';
  }

  // Utility Methods
  formatCurrency(amount: number): string {
    return this.billService.formatCurrency(amount);
  }

  getStatusColor(status: string): string {
    const colors = {
      'DRAFT': '#9e9e9e',
      'GENERATED': '#2196f3',
      'PAID': '#4caf50',
      'CANCELLED': '#f44336'
    };
    return colors[status as keyof typeof colors] || '#9e9e9e';
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