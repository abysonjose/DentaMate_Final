import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  billId: string;
  patientId: string;
  patientName: string;
  patientAddress?: string;
  patientPhone?: string;
  appointmentId: string;
  billableItems: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: 'DRAFT' | 'GENERATED' | 'SENT' | 'PAID' | 'CANCELLED';
  createdDate: Date;
  dueDate: Date;
  paidDate?: Date;
  billingStaffId: string;
  billingStaffName: string;
  clinicDetails: ClinicDetails;
  notes?: string;
  paymentTerms?: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  total: number;
  category: string;
  taxable: boolean;
  taxRate?: number;
  taxAmount?: number;
}

export interface ClinicDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber?: string;
  logo?: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  templateHtml: string;
  isDefault: boolean;
  createdDate: Date;
}

export interface InvoiceFilters {
  status?: string;
  patientName?: string;
  invoiceNumber?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = `${environment.apiUrl}/billing/invoices`;

  constructor(private http: HttpClient) {}

  // Invoice Management
  getInvoices(filters?: InvoiceFilters): Observable<Invoice[]> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof InvoiceFilters];
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            params = params.set(key, value.toISOString());
          } else {
            params = params.set(key, value.toString());
          }
        }
      });
    }

    return this.http.get<Invoice[]>(this.apiUrl, { params });
  }

  getInvoiceById(invoiceId: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/${invoiceId}`);
  }

  getInvoiceByNumber(invoiceNumber: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/number/${invoiceNumber}`);
  }

  generateInvoice(billId: string): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/generate`, { billId });
  }

  updateInvoiceStatus(invoiceId: string, status: string): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.apiUrl}/${invoiceId}/status`, { status });
  }

  cancelInvoice(invoiceId: string, reason: string): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.apiUrl}/${invoiceId}/cancel`, { reason });
  }

  // Invoice Generation and PDF
  generateInvoicePDF(invoiceId: string, templateId?: string): Observable<Blob> {
    let params = new HttpParams();
    if (templateId) {
      params = params.set('templateId', templateId);
    }

    return this.http.get(`${this.apiUrl}/${invoiceId}/pdf`, {
      params,
      responseType: 'blob'
    });
  }

  previewInvoice(invoiceId: string, templateId?: string): Observable<string> {
    let params = new HttpParams();
    if (templateId) {
      params = params.set('templateId', templateId);
    }

    return this.http.get(`${this.apiUrl}/${invoiceId}/preview`, {
      params,
      responseType: 'text'
    });
  }

  printInvoice(invoiceId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${invoiceId}/print`, {});
  }

  // Invoice Templates
  getInvoiceTemplates(): Observable<InvoiceTemplate[]> {
    return this.http.get<InvoiceTemplate[]>(`${this.apiUrl}/templates`);
  }

  getDefaultTemplate(): Observable<InvoiceTemplate> {
    return this.http.get<InvoiceTemplate>(`${this.apiUrl}/templates/default`);
  }

  // Invoice Sending
  sendInvoiceEmail(invoiceId: string, emailAddress: string, subject?: string, message?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${invoiceId}/send/email`, {
      emailAddress,
      subject,
      message
    });
  }

  sendInvoiceSMS(invoiceId: string, phoneNumber: string, message?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${invoiceId}/send/sms`, {
      phoneNumber,
      message
    });
  }

  sendInvoiceWhatsApp(invoiceId: string, phoneNumber: string, message?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${invoiceId}/send/whatsapp`, {
      phoneNumber,
      message
    });
  }

  // Invoice History and Tracking
  getInvoiceHistory(invoiceId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${invoiceId}/history`);
  }

  getPatientInvoices(patientId: string): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  // Invoice Statistics
  getInvoiceStatistics(startDate?: Date, endDate?: Date): Observable<any> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get(`${this.apiUrl}/statistics`, { params });
  }

  getDailyInvoiceSummary(date?: Date): Observable<any> {
    const params = date ? new HttpParams().set('date', date.toISOString()) : new HttpParams();
    return this.http.get(`${this.apiUrl}/summary/daily`, { params });
  }

  // Invoice Validation
  validateInvoice(invoice: Partial<Invoice>): string[] {
    const errors: string[] = [];

    if (!invoice.patientId) {
      errors.push('Patient ID is required');
    }

    if (!invoice.billableItems || invoice.billableItems.length === 0) {
      errors.push('At least one billable item is required');
    }

    if (!invoice.totalAmount || invoice.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    if (!invoice.dueDate) {
      errors.push('Due date is required');
    }

    return errors;
  }

  // Utility Methods
  generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const timestamp = Date.now().toString().substr(-4);
    return `INV${year}${month}${timestamp}`;
  }

  calculateInvoiceTotals(items: InvoiceItem[]): { subtotal: number; taxAmount: number; totalAmount: number } {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const totalAmount = subtotal + taxAmount;

    return { subtotal, taxAmount, totalAmount };
  }

  formatInvoiceStatus(status: string): string {
    const statusNames = {
      'DRAFT': 'Draft',
      'GENERATED': 'Generated',
      'SENT': 'Sent',
      'PAID': 'Paid',
      'CANCELLED': 'Cancelled'
    };
    return statusNames[status as keyof typeof statusNames] || status;
  }

  getInvoiceStatusColor(status: string): string {
    const statusColors = {
      'DRAFT': '#9e9e9e',
      'GENERATED': '#2196f3',
      'SENT': '#ff9800',
      'PAID': '#4caf50',
      'CANCELLED': '#f44336'
    };
    return statusColors[status as keyof typeof statusColors] || '#9e9e9e';
  }

  getInvoiceStatusIcon(status: string): string {
    const statusIcons = {
      'DRAFT': 'edit',
      'GENERATED': 'description',
      'SENT': 'send',
      'PAID': 'check_circle',
      'CANCELLED': 'cancel'
    };
    return statusIcons[status as keyof typeof statusIcons] || 'description';
  }

  isInvoiceOverdue(invoice: Invoice): boolean {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      return false;
    }
    return new Date(invoice.dueDate) < new Date();
  }

  getDaysOverdue(invoice: Invoice): number {
    if (!this.isInvoiceOverdue(invoice)) {
      return 0;
    }
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  downloadInvoicePDF(invoiceId: string, templateId?: string): void {
    this.generateInvoicePDF(invoiceId, templateId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoiceId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading invoice PDF:', error);
      }
    });
  }

  printInvoicePDF(invoiceId: string, templateId?: string): void {
    this.generateInvoicePDF(invoiceId, templateId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url);
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            printWindow.close();
          };
        }
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error printing invoice PDF:', error);
      }
    });
  }
}