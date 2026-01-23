import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LabDoctorIntegrationService, LabDoctorNotification, LabRequestStatus } from '../../../../shared/services/lab-doctor-integration.service';

@Component({
  selector: 'app-lab-notifications',
  templateUrl: './lab-notifications.component.html',
  styleUrls: ['./lab-notifications.component.scss']
})
export class LabNotificationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  notifications: LabDoctorNotification[] = [];
  requestStatuses: LabRequestStatus[] = [];
  
  // Filter options
  selectedFilter = 'all';
  filterOptions = [
    { value: 'all', label: 'All Notifications' },
    { value: 'unread', label: 'Unread' },
    { value: 'critical', label: 'Critical' },
    { value: 'results_available', label: 'Results Available' },
    { value: 'request_delayed', label: 'Delayed Requests' }
  ];

  // UI state
  isLoading = false;
  showOnlyUnread = false;

  constructor(
    private integrationService: LabDoctorIntegrationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.loadRequestStatuses();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNotifications(): void {
    this.isLoading = true;
    
    this.integrationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.notifications = notifications;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.snackBar.open('Error loading notifications', 'Close', {
            duration: 3000
          });
          this.isLoading = false;
        }
      });
  }

  private loadRequestStatuses(): void {
    this.integrationService.requestStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (statuses) => {
          this.requestStatuses = statuses;
        },
        error: (error) => {
          console.error('Error loading request statuses:', error);
        }
      });
  }

  private setupRealTimeUpdates(): void {
    // Listen for new notifications
    this.integrationService.newNotification$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification) => {
        this.showNotificationToast(notification);
      });

    // Listen for status updates
    this.integrationService.statusUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.showStatusUpdateToast(status);
      });

    // Listen for results available
    this.integrationService.resultAvailable$
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.showResultAvailableToast(result);
      });
  }

  private showNotificationToast(notification: LabDoctorNotification): void {
    const action = notification.priority === 'critical' ? 'VIEW NOW' : 'View';
    const duration = notification.priority === 'critical' ? 0 : 5000;
    
    const snackBarRef = this.snackBar.open(
      `${notification.title}: ${notification.message}`,
      action,
      {
        duration,
        panelClass: this.getNotificationClass(notification.priority)
      }
    );

    if (action === 'VIEW NOW' || action === 'View') {
      snackBarRef.onAction().subscribe(() => {
        this.onNotificationClick(notification);
      });
    }
  }

  private showStatusUpdateToast(status: LabRequestStatus): void {
    this.snackBar.open(
      `Lab request for ${status.patientName} is now ${status.status}`,
      'View',
      {
        duration: 4000
      }
    ).onAction().subscribe(() => {
      // Navigate to lab request details
      console.log('Navigate to request:', status.requestId);
    });
  }

  private showResultAvailableToast(result: any): void {
    const message = result.resultType === 'critical' 
      ? `CRITICAL: Lab results available for ${result.patientName}`
      : `Lab results available for ${result.patientName}`;
    
    this.snackBar.open(message, 'VIEW RESULTS', {
      duration: result.resultType === 'critical' ? 0 : 6000,
      panelClass: result.resultType === 'critical' ? ['critical-notification'] : []
    }).onAction().subscribe(() => {
      // Navigate to results
      console.log('Navigate to results:', result.requestId);
    });
  }

  // Event handlers
  onFilterChange(): void {
    // Filter logic is handled in the template with pipes
  }

  onNotificationClick(notification: LabDoctorNotification): void {
    // Mark as read if not already
    if (!notification.read) {
      this.integrationService.markNotificationAsRead(notification.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }

    // Handle different notification types
    switch (notification.type) {
      case 'results_available':
      case 'critical_result':
        // Navigate to lab results
        console.log('Navigate to results for request:', notification.requestId);
        break;
      case 'request_delayed':
        // Navigate to request details
        console.log('Navigate to request details:', notification.requestId);
        break;
      case 'quality_issue':
        // Navigate to quality issue details
        console.log('Navigate to quality issue:', notification.requestId);
        break;
      default:
        // Default action
        console.log('Handle notification:', notification);
    }
  }

  onAcknowledgeNotification(notification: LabDoctorNotification, event: Event): void {
    event.stopPropagation();
    
    this.integrationService.acknowledgeNotification(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          notification.acknowledged = true;
          this.snackBar.open('Notification acknowledged', 'Close', {
            duration: 2000
          });
        },
        error: (error) => {
          console.error('Error acknowledging notification:', error);
          this.snackBar.open('Error acknowledging notification', 'Close', {
            duration: 3000
          });
        }
      });
  }

  onMarkAllAsRead(): void {
    const unreadNotifications = this.notifications.filter(n => !n.read);
    
    unreadNotifications.forEach(notification => {
      this.integrationService.markNotificationAsRead(notification.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    });

    this.snackBar.open(`${unreadNotifications.length} notifications marked as read`, 'Close', {
      duration: 3000
    });
  }

  onClearAll(): void {
    if (confirm('Are you sure you want to clear all notifications?')) {
      // Implementation for clearing notifications
      this.snackBar.open('All notifications cleared', 'Close', {
        duration: 3000
      });
    }
  }

  // Utility methods
  getFilteredNotifications(): LabDoctorNotification[] {
    let filtered = this.notifications;

    switch (this.selectedFilter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'critical':
        filtered = filtered.filter(n => n.priority === 'critical');
        break;
      case 'results_available':
        filtered = filtered.filter(n => n.type === 'results_available' || n.type === 'critical_result');
        break;
      case 'request_delayed':
        filtered = filtered.filter(n => n.type === 'request_delayed');
        break;
    }

    return filtered;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'lab_request_created': return 'assignment';
      case 'results_available': return 'assignment_turned_in';
      case 'critical_result': return 'priority_high';
      case 'request_delayed': return 'schedule';
      case 'quality_issue': return 'report_problem';
      default: return 'notifications';
    }
  }

  getNotificationColor(priority: string): string {
    switch (priority) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      case 'low': return '';
      default: return '';
    }
  }

  getNotificationClass(priority: string): string[] {
    switch (priority) {
      case 'critical': return ['critical-notification'];
      case 'high': return ['high-priority-notification'];
      default: return [];
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'primary';
      case 'in_progress': return 'accent';
      case 'on_hold': return 'warn';
      case 'cancelled': return 'warn';
      case 'received': return '';
      default: return '';
    }
  }

  formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getCriticalCount(): number {
    return this.notifications.filter(n => n.priority === 'critical' && !n.acknowledged).length;
  }

  hasUnreadNotifications(): boolean {
    return this.getUnreadCount() > 0;
  }

  hasCriticalNotifications(): boolean {
    return this.getCriticalCount() > 0;
  }
}