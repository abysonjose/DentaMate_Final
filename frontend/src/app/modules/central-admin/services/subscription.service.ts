import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  maxUsers: number;
  maxBranches: number;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  clinicId: string;
  clinicName: string;
  planId: string;
  planName: string;
  status: 'active' | 'inactive' | 'suspended' | 'expired' | 'cancelled';
  startDate: Date;
  endDate: Date;
  renewalDate: Date;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  autoRenewal: boolean;
  paymentMethod: string;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  totalPaid: number;
  outstandingAmount: number;
  usageStats: {
    currentUsers: number;
    maxUsers: number;
    currentBranches: number;
    maxBranches: number;
    featuresUsed: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentHistory {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending' | 'refunded';
  paymentMethod: string;
  transactionId: string;
  paymentDate: Date;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly apiUrl = `${environment.apiUrl}/central-admin/subscriptions`;
  private readonly plansApiUrl = `${environment.apiUrl}/central-admin/subscription-plans`;

  constructor(private http: HttpClient) {}

  // Subscription Plans Management
  getAllPlans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(this.plansApiUrl);
  }

  getPlanById(id: string): Observable<SubscriptionPlan> {
    return this.http.get<SubscriptionPlan>(`${this.plansApiUrl}/${id}`);
  }

  createPlan(plan: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    return this.http.post<SubscriptionPlan>(this.plansApiUrl, plan);
  }

  updatePlan(id: string, plan: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    return this.http.put<SubscriptionPlan>(`${this.plansApiUrl}/${id}`, plan);
  }

  deletePlan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.plansApiUrl}/${id}`);
  }

  activatePlan(id: string): Observable<void> {
    return this.http.patch<void>(`${this.plansApiUrl}/${id}/activate`, {});
  }

  deactivatePlan(id: string): Observable<void> {
    return this.http.patch<void>(`${this.plansApiUrl}/${id}/deactivate`, {});
  }

  // Subscriptions Management
  getAllSubscriptions(): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(this.apiUrl);
  }

  getSubscriptionById(id: string): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.apiUrl}/${id}`);
  }

  getSubscriptionByClinic(clinicId: string): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.apiUrl}/clinic/${clinicId}`);
  }

  createSubscription(subscription: Partial<Subscription>): Observable<Subscription> {
    return this.http.post<Subscription>(this.apiUrl, subscription);
  }

  updateSubscription(id: string, subscription: Partial<Subscription>): Observable<Subscription> {
    return this.http.put<Subscription>(`${this.apiUrl}/${id}`, subscription);
  }

  cancelSubscription(id: string, reason?: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/cancel`, { reason });
  }

  suspendSubscription(id: string, reason: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/suspend`, { reason });
  }

  reactivateSubscription(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/reactivate`, {});
  }

  // Plan Changes
  upgradePlan(subscriptionId: string, newPlanId: string): Observable<Subscription> {
    return this.http.patch<Subscription>(`${this.apiUrl}/${subscriptionId}/upgrade`, { planId: newPlanId });
  }

  downgradePlan(subscriptionId: string, newPlanId: string): Observable<Subscription> {
    return this.http.patch<Subscription>(`${this.apiUrl}/${subscriptionId}/downgrade`, { planId: newPlanId });
  }

  // Billing and Payments
  getPaymentHistory(subscriptionId: string): Observable<PaymentHistory[]> {
    return this.http.get<PaymentHistory[]>(`${this.apiUrl}/${subscriptionId}/payments`);
  }

  processPayment(subscriptionId: string, amount: number): Observable<PaymentHistory> {
    return this.http.post<PaymentHistory>(`${this.apiUrl}/${subscriptionId}/payment`, { amount });
  }

  refundPayment(paymentId: string, amount?: number): Observable<PaymentHistory> {
    return this.http.post<PaymentHistory>(`${this.apiUrl}/payments/${paymentId}/refund`, { amount });
  }

  generateInvoice(subscriptionId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${subscriptionId}/invoice`, { responseType: 'blob' });
  }

  // Auto-renewal Management
  enableAutoRenewal(subscriptionId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${subscriptionId}/auto-renewal/enable`, {});
  }

  disableAutoRenewal(subscriptionId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${subscriptionId}/auto-renewal/disable`, {});
  }

  // Usage Tracking
  getUsageStats(subscriptionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${subscriptionId}/usage`);
  }

  updateUsageStats(subscriptionId: string, stats: any): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${subscriptionId}/usage`, stats);
  }

  // Analytics and Reports
  getSubscriptionAnalytics(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics?period=${period}`);
  }

  getRevenueAnalytics(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/revenue?period=${period}`);
  }

  getChurnAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/churn`);
  }

  // Bulk Operations
  bulkUpdateStatus(subscriptionIds: string[], status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/bulk/status`, { subscriptionIds, status });
  }

  bulkChangePlan(subscriptionIds: string[], planId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/bulk/plan`, { subscriptionIds, planId });
  }

  // Search and Filter
  searchSubscriptions(query: string): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`);
  }

  filterSubscriptions(filters: any): Observable<Subscription[]> {
    return this.http.post<Subscription[]>(`${this.apiUrl}/filter`, filters);
  }

  // Export
  exportSubscriptions(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export?format=${format}`, { responseType: 'blob' });
  }

  exportPaymentHistory(format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/payments/export?format=${format}`, { responseType: 'blob' });
  }

  // Notifications and Alerts
  getExpiringSubscriptions(days: number = 30): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.apiUrl}/expiring?days=${days}`);
  }

  getOverduePayments(): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.apiUrl}/overdue`);
  }

  sendRenewalReminder(subscriptionId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${subscriptionId}/reminder`, {});
  }
}