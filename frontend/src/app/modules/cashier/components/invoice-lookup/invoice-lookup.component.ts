import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CashierService, Invoice } from '../../services/cashier.service';
import { PaymentDialogComponent } from '../../dialogs/payment-dialog/payment-dialog.component';

@Component({
  selector: 'app-invoice-lookup',
  templateUrl: './invoice-lookup.component.html',
  styleUrls: ['./invoice-lookup.component.scss']
})
export class InvoiceLookupComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  searchForm: FormGroup;
  dataSource = new MatTableDataSource<Invoice>();
  displayedColumns = [
    'invoiceNumber',
    'patientName',
    'totalAmount',
    'paidAmount',
    'pendingAmount',
    'status',
    'createdAt',
    'actions'
  ];

  loading = false;
  searchTypes = [
    { value: 'INVOICE_NUMBER', label: 'Invoice Number' },
    { value: 'PATIENT_ID', label: 'Patient ID' },
    { value: 'APPOINTMENT_ID', label: 'Appointment ID' }
  ];

  statusFilters = [
    { value: '', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' }
  ];

  constructor(
    private fb: FormBuilder,
    private cashierService: CashierService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.searchForm = this.fb.group({
      searchTerm: [''],
      searchType: ['INVOICE_NUMBER'],
      statusFilter: ['']
    });
  }

  ngOnInit(): void {
    this.loadPendingInvoices();
    this.setupTableSorting();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private setupTableSorting(): void {
    this.dataSource.sortingDataAccessor = (data: Invoice, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'invoiceNumber': return data.invoiceNumber;
        case 'patientName': return data.patientName;
        case 'totalAmount': return data.totalAmount;
        case 'paidAmount': return data.paidAmount;
        case 'pendingAmount': return data.pendingAmount;
        case 'status': return data.status;
        case 'createdAt': return new Date(data.createdAt).getTime();
        default: return '';
      }
    };
  }

  loadPendingInvoices(): void {
    this.loading = true;
    this.cashierService.getPendingInvoices().subscribe({
      next: (invoices) => {
        this.dataSource.data = invoices;
        this.loading = false;
      },
      error: (error) => {
        this.handleError('Failed to load pending invoices', error);
        this.loading = false;
      }
    });
  }

  searchInvoices(): void {
    const formValue = this.searchForm.value;
    
    if (!formValue.searchTerm.trim()) {
      this.loadPendingInvoices();
      return;
    }

    this.loading = true;
    this.cashierService.searchInvoices(formValue.searchTerm, formValue.searchType).subscribe({
      next: (invoices) => {
        let filteredInvoices = invoices;
        
        // Apply status filter if selected
        if (formValue.statusFilter) {
          filteredInvoices = invoices.filter(invoice => invoice.status === formValue.statusFilter);
        }
        
        this.dataSource.data = filteredInvoices;
        this.loading = false;
        
        if (filteredInvoices.length === 0) {
          this.snackBar.open('No invoices found matching your criteria', 'Close', { duration: 3000 });
        }
      },
      error: (error) => {
        this.handleError('Search failed', error);
        this.loading = false;
      }
    });
  }

  clearSearch(): void {
    this.searchForm.reset({
      searchTerm: '',
      searchType: 'INVOICE_NUMBER',
      statusFilter: ''
    });
    this.loadPendingInvoices();
  }

  openPaymentDialog(invoice: Invoice): void {
    if (invoice.status === 'PAID') {
      this.snackBar.open('This invoice is already fully paid', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '600px',
      data: { invoice }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Payment processed successfully', 'Close', { duration: 3000 });
        this.refreshInvoiceData();
      }
    });
  }

  viewInvoiceDetails(invoice: Invoice): void {
    // This would open a detailed invoice view dialog
    this.snackBar.open('Invoice details view - To be implemented', 'Close', { duration: 2000 });
  }

  markAsPaid(invoice: Invoice): void {
    if (invoice.status === 'PAID') {
      this.snackBar.open('Invoice is already marked as paid', 'Close', { duration: 3000 });
      return;
    }

    this.cashierService.markInvoiceAsPaid(invoice.id).subscribe({
      next: () => {
        this.snackBar.open('Invoice marked as paid', 'Close', { duration: 3000 });
        this.refreshInvoiceData();
      },
      error: (error) => this.handleError('Failed to mark invoice as paid', error)
    });
  }

  private refreshInvoiceData(): void {
    const formValue = this.searchForm.value;
    if (formValue.searchTerm.trim()) {
      this.searchInvoices();
    } else {
      this.loadPendingInvoices();
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PAID': return 'primary';
      case 'PARTIALLY_PAID': return 'accent';
      case 'PENDING': return 'warn';
      case 'OVERDUE': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PAID': return 'check_circle';
      case 'PARTIALLY_PAID': return 'schedule';
      case 'PENDING': return 'pending';
      case 'OVERDUE': return 'error';
      default: return 'help';
    }
  }

  canCollectPayment(invoice: Invoice): boolean {
    return invoice.status !== 'PAID' && invoice.pendingAmount > 0;
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.snackBar.open(message, 'Close', { duration: 5000 });
  }

  // Export functionality
  exportToCSV(): void {
    const csvData = this.dataSource.data.map(invoice => ({
      'Invoice Number': invoice.invoiceNumber,
      'Patient Name': invoice.patientName,
      'Total Amount': invoice.totalAmount,
      'Paid Amount': invoice.paidAmount,
      'Pending Amount': invoice.pendingAmount,
      'Status': invoice.status,
      'Created Date': new Date(invoice.createdAt).toLocaleDateString()
    }));

    // Convert to CSV and download
    const csv = this.convertToCSV(csvData);
    this.downloadCSV(csv, 'invoices.csv');
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  private downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}