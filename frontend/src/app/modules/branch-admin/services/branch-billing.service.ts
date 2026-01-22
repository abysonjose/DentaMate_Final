import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface BranchBill {
  id: string;
  billNumber: string;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  paymentMethod?: string;
  createdDate: Date;
  dueDate: Date;
  paidDate?: Date;
  createdBy: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchBillingService {
  private readonly apiUrl = `${environment.apiUrl}/branch-admin/billing`;

  constructor(private http: HttpClient) {}

  // Read-only billing operations for branch admin
  getAllBills(status?: string): Observable<BranchBill[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<BranchBill[]>(`${this.apiUrl}${params}`);
  }

  getBillById(id: string): Observable<BranchBill> {
    return this.http.get<BranchBill>(`${this.apiUrl}/${id}`);
  }

  getPendingBills(): Observable<BranchBill[]> {
    return this.http.get<BranchBill[]>(`${this.apiUrl}/pending`);
  }

  getOverdueBills(): Observable<BranchBill[]> {
    return this.http.get<BranchBill[]>(`${this.apiUrl}/overdue`);
  }

  getDailyRevenue(date?: string): Observable<any> {
    const params = date ? `?date=${date}` : '';
    return this.http.get(`${this.apiUrl}/revenue/daily${params}`);
  }

  getMonthlyRevenue(month?: string): Observable<any> {
    const params = month ? `?month=${month}` : '';
    return this.http.get(`${this.apiUrl}/revenue/monthly${params}`);
  }

  getPaymentMethodAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/payment-methods`);
  }

  getBillingAnalytics(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics?period=${period}`);
  }

  exportBillingReport(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export?format=${format}`, { responseType: 'blob' });
  }
}