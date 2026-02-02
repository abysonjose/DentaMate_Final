import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { 
  CashierBillingService, 
  Invoice 
} from '../../services/cashier-billing.service';
import { InvoiceDetailsDialogComponent } from '../../dialogs/invoice-details-dialog/invoice-details-dialog.component';

@Component({
  selector: 'app-invoice-status-view',
  templateUrl: './invoice-status-view.component.html',
  styleUrls: ['./invoice-status-view.component.scss']
})
export class InvoiceStatusViewComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();

  displayedColumns: string[] = [
    'invoiceNumber',
    'patientName',
    'invoiceDate',
    'dueDate',
    'totalAmount',
    'paidAmount',
    'balanceAmount',
    'paymentStatus',
    'status',
    'actions'
  ];

  dataSource = new MatTableDataSource<Invoice>();
  isLoading = true;
  error: string | null = null;

  // Filters
  searchControl = new FormControl('');
  paymentStatusFilter = new FormControl('all');
  statusFilter = new FormControl('all');
  dateFromControl = new FormControl();
  dateToControl = new FormControl();

  paymentStatusOptions = [
    { value: 'all', label: 'All Payment Status' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partial', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' },
    { value: 'refunded', label: 'Refunded' }
  ];

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'generated', label: 'Generated' },
    { value: 'sent', label: 'Sent' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  constructor(
    private billingService: CashierBillingService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setupFilters();
    this.loadInvoices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters(): void {
    // Search filter
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });

    // Status filters
    this.paymentStatusFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadInvoices();
      });

    this.statusFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadInvoices();
      });

    // Date filters
    this.dateFromControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadInvoices();
      });

    this.dateToControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadInvoices();
      });
  }

  private loadInvoices(): void {
    this.isLoading = true;
    this.error = null;

    // Since we don't have a direct getInvoices method, we'll simulate it
    // In a real implementation, this would call billingService.getInvoices(filters)
    
    // For now, we'll create mock data to demonstrate the functionality
    setTimeout(() => {
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          invoiceNumber: 'INV-2024-001',
          patientId: 'p1',
          patientName: 'John Doe',
          patientPhone: '+1234567890',
          doctorId: 'd1',
          doctorName: 'Dr. Smith',
          appointmentId: 'a1',
          treatmentId: 't1',
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-01-30'),
          services: [],
          subtotal: 500,
          discountAmount: 50,
          taxAmount: 45,
          totalAmount: 495,
          status: 'generated',
          paymentStatus: 'unpaid',
          paidAmount: 0,
          balanceAmount: 495,
          generatedBy: 'cashier1',
          generatedAt: new Date('2024-01-15')
        },
        {
          id: '2',
          invoiceNumber: 'INV-2024-002',
          patientId: 'p2',
          patientName: 'Jane Smith',
          patientPhone: '+1234567891',
          doctorId: 'd2',
          doctorName: 'Dr. Johnson',
          appointmentId: 'a2',
          treatmentId: 't2',
          invoiceDate: new Date('2024-01-16'),
          dueDate: new Date('2024-01-31'),
          services: [],
          subtotal: 750,
          discountAmount: 0,
          taxAmount: 67.5,
          totalAmount: 817.5,
          status: 'generated',
          paymentStatus: 'paid',
          paidAmount: 817.5,
          balanceAmount: 0,
          generatedBy: 'cashier1',
          generatedAt: new Date('2024-01-16'),
          paidAt: new Date('2024-01-20')
        }
      ];

      this.dataSource.data = mockInvoices;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.applyFilters();
      this.isLoading = false;
    }, 1000);
  }

  private applyFilters(): void {
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    
    this.dataSource.filterPredicate = (data: Invoice, filter: string) => {
      return data.patientName.toLowerCase().includes(filter) ||
             data.invoiceNumber.toLowerCase().includes(filter) ||
             data.doctorName.toLowerCase().includes(filter);
    };
    
    this.dataSource.filter = searchTerm;
  }

  viewInvoiceDetails(invoice: Invoice): void {
    const dialogRef = this.dialog.open(InvoiceDetailsDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { 
        invoice: invoice,
        mode: 'view'
      }
    });
  }

  downloadInvoice(invoice: Invoice): void {
    this.billingService.generateInvoicePDF(invoice.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${invoice.invoiceNumber}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error downloading invoice:', error);
          this.snackBar.open('Failed to download invoice', 'Close', { duration: 3000 });
        }
      });
  }

  sendInvoice(invoice: Invoice, method: 'email' | 'sms' | 'whatsapp'): void {
    this.billingService.sendInvoice(invoice.id, method)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open(`Invoice sent via ${method}`, 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error sending invoice:', error);
          this.snackBar.open(`Failed to send invoice via ${method}`, 'Close', { duration: 3000 });
        }
      });
  }

  getPaymentStatusColor(status: string): string {
    switch (status) {
      case 'paid':
        return 'primary';
      case 'partial':
        return 'accent';
      case 'unpaid':
        return 'warn';
      case 'refunded':
        return 'primary';
      default:
        return 'primary';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'generated':
        return 'primary';
      case 'sent':
        return 'accent';
      case 'overdue':
        return 'warn';
      case 'cancelled':
        return 'warn';
      case 'draft':
        return 'primary';
      default:
        return 'primary';
    }
  }

  getPaymentStatusLabel(status: string): string {
    switch (status) {
      case 'unpaid':
        return 'Unpaid';
      case 'partial':
        return 'Partially Paid';
      case 'paid':
        return 'Paid';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'generated':
        return 'Generated';
      case 'sent':
        return 'Sent';
      case 'overdue':
        return 'Overdue';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  isOverdue(invoice: Invoice): boolean {
    return invoice.status === 'overdue' || 
           (invoice.paymentStatus === 'unpaid' && new Date() > invoice.dueDate);
  }

  canSendInvoice(invoice: Invoice): boolean {
    return invoice.status === 'generated' && invoice.paymentStatus !== 'paid';
  }

  refreshInvoices(): void {
    this.loadInvoices();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.paymentStatusFilter.setValue('all');
    this.statusFilter.setValue('all');
    this.dateFromControl.setValue(null);
    this.dateToControl.setValue(null);
  }

  exportInvoices(): void {
    // Implementation for exporting invoices
    console.log('Export invoices functionality');
  }
}