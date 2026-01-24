import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Receipt {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  patientId: string;
  paymentId: string;
  amount: number;
  paymentMode: string;
  transactionId?: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  branchName: string;
  generatedAt: Date;
  items: ReceiptItem[];
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptTemplate {
  header: {
    clinicName: string;
    branchName: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
  footer: {
    thankYouMessage: string;
    terms?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private apiUrl = `${environment.apiUrl}/receipts`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'Content-Type': 'application/json'
    });
  }

  // Receipt Generation
  generateReceipt(paymentId: string): Observable<Receipt> {
    return this.http.post<Receipt>(`${this.apiUrl}/generate`, { paymentId }, { 
      headers: this.getHeaders() 
    });
  }

  getReceiptById(receiptId: string): Observable<Receipt> {
    return this.http.get<Receipt>(`${this.apiUrl}/${receiptId}`, { headers: this.getHeaders() });
  }

  getReceiptByNumber(receiptNumber: string): Observable<Receipt> {
    return this.http.get<Receipt>(`${this.apiUrl}/number/${receiptNumber}`, { headers: this.getHeaders() });
  }

  // Receipt Actions
  printReceipt(receiptId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${receiptId}/print`, { 
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  downloadReceipt(receiptId: string, format: 'PDF' | 'HTML' = 'PDF'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${receiptId}/download`, { 
      headers: this.getHeaders(),
      params: { format },
      responseType: 'blob'
    });
  }

  emailReceipt(receiptId: string, email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${receiptId}/email`, { email }, { 
      headers: this.getHeaders() 
    });
  }

  smsReceipt(receiptId: string, phoneNumber: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${receiptId}/sms`, { phoneNumber }, { 
      headers: this.getHeaders() 
    });
  }

  // Receipt History
  getReceiptHistory(filters?: any): Observable<Receipt[]> {
    return this.http.get<Receipt[]>(`${this.apiUrl}/history`, { 
      headers: this.getHeaders(),
      params: filters 
    });
  }

  getReceiptsByDate(date: string): Observable<Receipt[]> {
    return this.http.get<Receipt[]>(`${this.apiUrl}/history/date/${date}`, { 
      headers: this.getHeaders() 
    });
  }

  getReceiptsByPatient(patientId: string): Observable<Receipt[]> {
    return this.http.get<Receipt[]>(`${this.apiUrl}/history/patient/${patientId}`, { 
      headers: this.getHeaders() 
    });
  }

  // Receipt Templates
  getReceiptTemplate(): Observable<ReceiptTemplate> {
    return this.http.get<ReceiptTemplate>(`${this.apiUrl}/template`, { headers: this.getHeaders() });
  }

  // Receipt Validation
  validateReceipt(receiptNumber: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/validate/${receiptNumber}`, { headers: this.getHeaders() });
  }

  // Duplicate Receipt
  generateDuplicateReceipt(originalReceiptId: string, reason: string): Observable<Receipt> {
    return this.http.post<Receipt>(`${this.apiUrl}/${originalReceiptId}/duplicate`, { reason }, { 
      headers: this.getHeaders() 
    });
  }

  // Receipt Statistics
  getReceiptStats(period: 'TODAY' | 'WEEK' | 'MONTH'): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/${period}`, { headers: this.getHeaders() });
  }

  // Utility Methods
  formatReceiptForPrint(receipt: Receipt): string {
    return `
      RECEIPT
      -------
      Receipt No: ${receipt.receiptNumber}
      Date: ${new Date(receipt.generatedAt).toLocaleDateString()}
      
      Patient: ${receipt.patientName}
      Invoice: ${receipt.invoiceNumber}
      
      Amount: ₹${receipt.amount.toFixed(2)}
      Payment Mode: ${receipt.paymentMode}
      ${receipt.transactionId ? `Transaction ID: ${receipt.transactionId}` : ''}
      
      Cashier: ${receipt.cashierName}
      
      Thank you for your payment!
    `;
  }
}