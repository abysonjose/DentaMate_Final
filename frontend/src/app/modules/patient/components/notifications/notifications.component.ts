import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PatientService, Notification } from '../../services/patient.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-notifications',
  template: `
    <div class="notifications">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Notifications</h1>
          <p class="subtitle">Stay updated with your health journey</p>
        </div>
        <div class="header-actions">
          <button mat-icon-button (click)="markAllAsRead()" 
                  [disabled]="unreadCount === 0"
                  matTooltip="Mark all as read">
            <mat-icon>done_all</mat-icon>
          </button>
          <button mat-icon-button (click)="refreshNotifications()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading your notifications...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading" class="notifications-content">
        
        <!-- Summary -->
        <div class="summary-section" *ngIf="notifications.length > 0">
          <mat-card class="summary-card">
            <mat-card-content>
              <div class="summary-stats">
                <div class="stat-item">
                  <mat-icon color="primary">notifications</mat-icon>
                  <div class="stat-info">
                    <span class="stat-value">{{notifications.length}}</span>
                    <span class="stat-label">Total</span>
                  </div>
                </div>
                <div class="stat-item">
                  <mat-icon color="warn">fiber_manual_record</mat-icon>
                  <div class="stat-info">
                    <span class="stat-value">{{unreadCount}}</span>
                    <span class="stat-label">Unread</span>
                  </div>
                </div>
                <div class="stat-item">
                  <mat-icon color="accent">schedule</mat-icon>
                  <div class="stat-info">
                    <span class="stat-value">{{todayCount}}</span>
                    <span class="stat-label">Today</span>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Filter Tabs -->
        <mat-card class="filter-card" *ngIf="notifications.length > 0">
          <mat-card-content>
            <mat-chip-set aria-label="Notification filters" [multiple]="false">
              <mat-chip-option 
                *ngFor="let filter of filters" 
                [selected]="selectedFilter === filter.value"
                (click)="applyFilter(filter.value)">
                <mat-icon>{{filter.icon}}</mat-icon>
                {{filter.label}}
                <span *ngIf="filter.count > 0" class="filter-count">({{filter.count}})</span>
              </mat-chip-option>
            </mat-chip-set>
          </mat-card-content>
        </mat-card>

        <!-- Empty State -->
        <div *ngIf="filteredNotifications.length === 0 && !loading" class="empty-state">
          <mat-card class="empty-state-card">
            <mat-card-content>
              <mat-icon>notifications_none</mat-icon>
              <h3 *ngIf="selectedFilter === 'all'">No notifications</h3>
              <h3 *ngIf="selectedFilter !== 'all'">No {{selectedFilter}} notifications</h3>
              <p *ngIf="selectedFilter === 'all'">You're all caught up! New notifications will appear here.</p>
              <p *ngIf="selectedFilter !== 'all'">No notifications found for this category.</p>
              <button *ngIf="selectedFilter !== 'all'" mat-button (click)="applyFilter('all')">
                View All Notifications
              </button>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Notifications List -->
        <div *ngIf="filteredNotifications.length > 0" class="notifications-list">
          <mat-card *ngFor="let notification of filteredNotifications" 
                   class="notification-card" 
                   [class.unread]="!notification.isRead"
                   [class]="'type-' + notification.type.toLowerCase()">
            
            <mat-card-content>
              <div class="notification-content">
                
                <!-- Notification Icon -->
                <div class="notification-icon">
                  <mat-icon [color]="getNotificationColor(notification.type)">
                    {{getNotificationIcon(notification.type)}}
                  </mat-icon>
                </div>

                <!-- Notification Details -->
                <div class="notification-details">
                  <div class="notification-header">
                    <h4 class="notification-title">{{notification.title}}</h4>
                    <div class="notification-meta">
                      <span class="notification-time">{{getTimeAgo(notification.createdAt)}}</span>
                      <mat-icon *ngIf="!notification.isRead" class="unread-indicator">fiber_manual_record</mat-icon>
                    </div>
                  </div>
                  
                  <p class="notification-message">{{notification.message}}</p>
                  
                  <div class="notification-footer">
                    <mat-chip [color]="getNotificationColor(notification.type)" selected class="type-chip">
                      {{getNotificationTypeLabel(notification.type)}}
                    </mat-chip>
                    
                    <div class="notification-actions">
                      <button *ngIf="!notification.isRead" 
                              mat-icon-button 
                              (click)="markAsRead(notification)"
                              matTooltip="Mark as read">
                        <mat-icon>done</mat-icon>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Load More Button -->
        <div *ngIf="hasMoreNotifications" class="load-more-section">
          <button mat-raised-button color="primary" (click)="loadMoreNotifications()">
            <mat-icon>expand_more</mat-icon>
            Load More Notifications
          </button>
        </div>

      </div>
    </div>
  `,
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  selectedFilter = 'all';
  unreadCount = 0;
  todayCount = 0;
  hasMoreNotifications = false;

  filters = [
    { value: 'all', label: 'All', icon: 'notifications', count: 0 },
    { value: 'unread', label: 'Unread', icon: 'fiber_manual_record', count: 0 },
    { value: 'appointment_reminder', label: 'Appointments', icon: 'event', count: 0 },
    { value: 'queue_update', label: 'Queue Updates', icon: 'update', count: 0 },
    { value: 'payment_confirmation', label: 'Payments', icon: 'payment', count: 0 },
    { value: 'follow_up_reminder', label: 'Follow-ups', icon: 'medical_services', count: 0 },
    { value: 'general', label: 'General', icon: 'info', count: 0 }
  ];

  constructor(
    private patientService: PatientService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNotifications(): void {
    this.loading = true;
    
    this.patientService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.notifications = notifications.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.calculateCounts();
          this.updateFilterCounts();
          this.applyFilter(this.selectedFilter);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.snackBar.open('Error loading notifications', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  private calculateCounts(): void {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.todayCount = this.notifications.filter(n => {
      const notificationDate = new Date(n.createdAt);
      notificationDate.setHours(0, 0, 0, 0);
      return notificationDate.getTime() === today.getTime();
    }).length;
  }

  private updateFilterCounts(): void {
    this.filters.forEach(filter => {
      switch (filter.value) {
        case 'all':
          filter.count = this.notifications.length;
          break;
        case 'unread':
          filter.count = this.unreadCount;
          break;
        default:
          filter.count = this.notifications.filter(n => 
            n.type.toLowerCase() === filter.value.toUpperCase()
          ).length;
      }
    });
  }

  applyFilter(filterValue: string): void {
    this.selectedFilter = filterValue;
    
    switch (filterValue) {
      case 'all':
        this.filteredNotifications = [...this.notifications];
        break;
      case 'unread':
        this.filteredNotifications = this.notifications.filter(n => !n.isRead);
        break;
      default:
        this.filteredNotifications = this.notifications.filter(n => 
          n.type.toLowerCase() === filterValue.toUpperCase()
        );
    }
  }

  markAsRead(notification: Notification): void {
    this.patientService.markNotificationAsRead(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          notification.isRead = true;
          this.calculateCounts();
          this.updateFilterCounts();
          this.snackBar.open('Notification marked as read', '', { duration: 1000 });
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
          this.snackBar.open('Error updating notification', 'Close', { duration: 3000 });
        }
      });
  }

  markAllAsRead(): void {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    
    if (unreadNotifications.length === 0) return;

    // Mark all as read locally first for immediate UI feedback
    unreadNotifications.forEach(n => n.isRead = true);
    this.calculateCounts();
    this.updateFilterCounts();
    this.applyFilter(this.selectedFilter);

    // Then sync with server
    Promise.all(
      unreadNotifications.map(n => 
        this.patientService.markNotificationAsRead(n.id).toPromise()
      )
    ).then(() => {
      this.snackBar.open('All notifications marked as read', '', { duration: 2000 });
    }).catch((error) => {
      console.error('Error marking all notifications as read:', error);
      // Revert changes on error
      this.loadNotifications();
      this.snackBar.open('Error updating notifications', 'Close', { duration: 3000 });
    });
  }

  refreshNotifications(): void {
    this.loadNotifications();
    this.snackBar.open('Notifications refreshed', '', { duration: 1000 });
  }

  loadMoreNotifications(): void {
    // In a real app, this would load more notifications from the server
    this.hasMoreNotifications = false;
    this.snackBar.open('No more notifications to load', '', { duration: 2000 });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'APPOINTMENT_REMINDER':
        return 'event';
      case 'QUEUE_UPDATE':
        return 'update';
      case 'PAYMENT_CONFIRMATION':
        return 'payment';
      case 'FOLLOW_UP_REMINDER':
        return 'medical_services';
      case 'GENERAL':
        return 'info';
      default:
        return 'notifications';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'APPOINTMENT_REMINDER':
        return 'primary';
      case 'QUEUE_UPDATE':
        return 'accent';
      case 'PAYMENT_CONFIRMATION':
        return 'warn';
      case 'FOLLOW_UP_REMINDER':
        return 'primary';
      case 'GENERAL':
        return 'accent';
      default:
        return 'primary';
    }
  }

  getNotificationTypeLabel(type: string): string {
    switch (type) {
      case 'APPOINTMENT_REMINDER':
        return 'Appointment';
      case 'QUEUE_UPDATE':
        return 'Queue Update';
      case 'PAYMENT_CONFIRMATION':
        return 'Payment';
      case 'FOLLOW_UP_REMINDER':
        return 'Follow-up';
      case 'GENERAL':
        return 'General';
      default:
        return 'Notification';
    }
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}