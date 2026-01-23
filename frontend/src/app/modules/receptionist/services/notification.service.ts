import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'appointment' | 'queue' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionable: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: any;
  expiresAt?: Date;
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  actionable?: boolean;
  autoClose?: boolean;
  duration?: number;
}

export interface SystemAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'system' | 'queue' | 'appointment' | 'patient' | 'doctor';
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  actionRequired: boolean;
  affectedServices?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;
  private readonly wsUrl = `${environment.wsUrl}/notifications`;
  
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();
  
  private systemAlertsSubject = new BehaviorSubject<SystemAlert[]>([]);
  public systemAlerts$ = this.systemAlertsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeWebSocketConnection();
  }

  // Notification Management
  getNotifications(limit: number = 50, unreadOnly: boolean = false): Observable<Notification[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (unreadOnly) {
      params = params.set('unreadOnly', 'true');
    }
    return this.http.get<Notification[]>(`${this.apiUrl}`, { params });
  }

  markAsRead(notificationId: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.apiUrl}/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.apiUrl}/mark-all-read`, {});
  }

  deleteNotification(notificationId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${notificationId}`);
  }

  clearAllNotifications(): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.apiUrl}/clear-all`);
  }

  // Alert Management
  createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): void {
    const newAlert: Alert = {
      ...alert,
      id: this.generateId(),
      timestamp: new Date()
    };
    
    const currentAlerts = this.alertsSubject.value;
    this.alertsSubject.next([newAlert, ...currentAlerts]);

    // Auto-close alert if specified
    if (alert.autoClose && alert.duration) {
      setTimeout(() => {
        this.dismissAlert(newAlert.id);
      }, alert.duration);
    }
  }

  dismissAlert(alertId: string): void {
    const currentAlerts = this.alertsSubject.value;
    const filteredAlerts = currentAlerts.filter(alert => alert.id !== alertId);
    this.alertsSubject.next(filteredAlerts);
  }

  clearAllAlerts(): void {
    this.alertsSubject.next([]);
  }

  getAlerts(): Observable<Alert[]> {
    return this.alerts$;
  }

  // System Alerts
  getSystemAlerts(): Observable<SystemAlert[]> {
    return this.http.get<SystemAlert[]>(`${this.apiUrl}/system-alerts`);
  }

  acknowledgeSystemAlert(alertId: string): Observable<SystemAlert> {
    return this.http.patch<SystemAlert>(`${this.apiUrl}/system-alerts/${alertId}/acknowledge`, {});
  }

  resolveSystemAlert(alertId: string, resolution: string): Observable<SystemAlert> {
    return this.http.patch<SystemAlert>(`${this.apiUrl}/system-alerts/${alertId}/resolve`, { resolution });
  }

  // Appointment Notifications
  sendAppointmentReminder(appointmentId: string, method: 'sms' | 'email' | 'whatsapp', customMessage?: string): Observable<{
    success: boolean;
    message: string;
    deliveryId: string;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      deliveryId: string;
    }>(`${this.apiUrl}/appointment-reminder`, {
      appointmentId,
      method,
      customMessage
    });
  }

  sendAppointmentConfirmation(appointmentId: string, method: 'sms' | 'email' | 'whatsapp'): Observable<{
    success: boolean;
    message: string;
    deliveryId: string;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      deliveryId: string;
    }>(`${this.apiUrl}/appointment-confirmation`, {
      appointmentId,
      method
    });
  }

  sendAppointmentCancellation(appointmentId: string, reason: string, method: 'sms' | 'email' | 'whatsapp'): Observable<{
    success: boolean;
    message: string;
    deliveryId: string;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      deliveryId: string;
    }>(`${this.apiUrl}/appointment-cancellation`, {
      appointmentId,
      reason,
      method
    });
  }

  // Queue Notifications
  sendTokenCalledNotification(tokenId: string, method: 'sms' | 'email' | 'whatsapp'): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/token-called`, {
      tokenId,
      method
    });
  }

  sendQueueDelayNotification(queueId: string, delayMinutes: number, reason: string): Observable<{
    notificationsSent: number;
    failed: number;
  }> {
    return this.http.post<{
      notificationsSent: number;
      failed: number;
    }>(`${this.apiUrl}/queue-delay`, {
      queueId,
      delayMinutes,
      reason
    });
  }

  // Bulk Notifications
  sendBulkNotifications(recipients: string[], message: string, type: 'sms' | 'email' | 'whatsapp'): Observable<{
    sent: number;
    failed: number;
    errors: string[];
  }> {
    return this.http.post<{
      sent: number;
      failed: number;
      errors: string[];
    }>(`${this.apiUrl}/bulk-send`, {
      recipients,
      message,
      type
    });
  }

  // Emergency Notifications
  sendEmergencyAlert(message: string, severity: 'low' | 'medium' | 'high' | 'critical', targetRoles?: string[]): Observable<{
    success: boolean;
    recipientCount: number;
  }> {
    return this.http.post<{
      success: boolean;
      recipientCount: number;
    }>(`${this.apiUrl}/emergency-alert`, {
      message,
      severity,
      targetRoles
    });
  }

  // Notification Templates
  getNotificationTemplates(category?: string): Observable<{
    id: string;
    name: string;
    category: string;
    template: string;
    variables: string[];
  }[]> {
    let params = new HttpParams();
    if (category) {
      params = params.set('category', category);
    }
    return this.http.get<{
      id: string;
      name: string;
      category: string;
      template: string;
      variables: string[];
    }[]>(`${this.apiUrl}/templates`, { params });
  }

  sendTemplatedNotification(templateId: string, recipientId: string, variables: { [key: string]: string }, method: 'sms' | 'email' | 'whatsapp'): Observable<{
    success: boolean;
    message: string;
    deliveryId: string;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      deliveryId: string;
    }>(`${this.apiUrl}/templated-send`, {
      templateId,
      recipientId,
      variables,
      method
    });
  }

  // Notification Preferences
  getPatientNotificationPreferences(patientId: string): Observable<{
    smsEnabled: boolean;
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    appointmentReminders: boolean;
    queueUpdates: boolean;
    marketingMessages: boolean;
    preferredLanguage: string;
  }> {
    return this.http.get<{
      smsEnabled: boolean;
      emailEnabled: boolean;
      whatsappEnabled: boolean;
      appointmentReminders: boolean;
      queueUpdates: boolean;
      marketingMessages: boolean;
      preferredLanguage: string;
    }>(`${this.apiUrl}/preferences/patient/${patientId}`);
  }

  updatePatientNotificationPreferences(patientId: string, preferences: {
    smsEnabled?: boolean;
    emailEnabled?: boolean;
    whatsappEnabled?: boolean;
    appointmentReminders?: boolean;
    queueUpdates?: boolean;
    marketingMessages?: boolean;
    preferredLanguage?: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/preferences/patient/${patientId}`, preferences);
  }

  // Delivery Status
  getNotificationDeliveryStatus(deliveryId: string): Observable<{
    id: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
    sentAt?: Date;
    deliveredAt?: Date;
    failureReason?: string;
    attempts: number;
  }> {
    return this.http.get<{
      id: string;
      status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
      sentAt?: Date;
      deliveredAt?: Date;
      failureReason?: string;
      attempts: number;
    }>(`${this.apiUrl}/delivery-status/${deliveryId}`);
  }

  // Notification Statistics
  getNotificationStats(startDate?: Date, endDate?: Date): Observable<{
    totalSent: number;
    delivered: number;
    failed: number;
    byMethod: {
      sms: number;
      email: number;
      whatsapp: number;
    };
    byType: {
      appointment: number;
      queue: number;
      system: number;
      marketing: number;
    };
    deliveryRate: number;
  }> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    return this.http.get<{
      totalSent: number;
      delivered: number;
      failed: number;
      byMethod: {
        sms: number;
        email: number;
        whatsapp: number;
      };
      byType: {
        appointment: number;
        queue: number;
        system: number;
        marketing: number;
      };
      deliveryRate: number;
    }>(`${this.apiUrl}/stats`, { params });
  }

  // Real-time Updates
  private initializeWebSocketConnection(): void {
    // WebSocket implementation for real-time notifications
    // This would connect to the WebSocket server and listen for notification events
  }

  // Utility Methods
  updateNotifications(notifications: Notification[]): void {
    this.notificationsSubject.next(notifications);
  }

  addNotification(notification: Notification): void {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...current]);
  }

  updateSystemAlerts(alerts: SystemAlert[]): void {
    this.systemAlertsSubject.next(alerts);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Quick Alert Methods
  showSuccess(message: string, autoClose: boolean = true): void {
    this.createAlert({
      type: 'success',
      message,
      actionable: false,
      autoClose,
      duration: autoClose ? 3000 : undefined
    });
  }

  showError(message: string, actionable: boolean = false): void {
    this.createAlert({
      type: 'error',
      message,
      actionable,
      autoClose: false
    });
  }

  showWarning(message: string, actionable: boolean = false): void {
    this.createAlert({
      type: 'warning',
      message,
      actionable,
      autoClose: false
    });
  }

  showInfo(message: string, autoClose: boolean = true): void {
    this.createAlert({
      type: 'info',
      message,
      actionable: false,
      autoClose,
      duration: autoClose ? 4000 : undefined
    });
  }

  // Format Helpers
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'appointment': return 'event';
      case 'queue': return 'queue';
      case 'system': return 'settings';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'check_circle';
      case 'info': return 'info';
      default: return 'notifications';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'error': return 'warn';
      case 'warning': return 'accent';
      case 'success': return 'primary';
      case 'info': return 'primary';
      default: return 'primary';
    }
  }

  formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}