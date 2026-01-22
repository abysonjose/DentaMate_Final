import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { PatientService, TokenStatus } from '../../services/patient.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-token-queue-status',
  templateUrl: './token-queue-status.component.html',
  styleUrls: ['./token-queue-status.component.scss']
})
export class TokenQueueStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  tokenStatus: TokenStatus | null = null;
  queueProgress = 0;
  estimatedWaitTime = '';
  lastUpdated = new Date();
  
  // Animation states
  isTokenCalled = false;
  showCallAnimation = false;

  constructor(
    private patientService: PatientService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTokenStatus();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTokenStatus(): void {
    this.loading = true;
    
    this.patientService.getCurrentTokenStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.tokenStatus = status;
          this.updateQueueProgress();
          this.updateEstimatedWaitTime();
          this.loading = false;
          
          if (status?.status === 'CALLED' && !this.isTokenCalled) {
            this.triggerCallAnimation();
          }
        },
        error: (error) => {
          console.error('Error loading token status:', error);
          this.snackBar.open('Error loading queue status', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  private setupRealTimeUpdates(): void {
    // Update every 15 seconds
    interval(15000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.tokenStatus) {
          this.refreshTokenStatus();
        }
      });
  }

  private refreshTokenStatus(): void {
    if (!this.tokenStatus) return;
    
    this.patientService.getQueueStatus(this.tokenStatus.tokenNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          const previousStatus = this.tokenStatus?.status;
          this.tokenStatus = status;
          this.updateQueueProgress();
          this.updateEstimatedWaitTime();
          this.lastUpdated = new Date();
          
          // Check if token was just called
          if (status.status === 'CALLED' && previousStatus !== 'CALLED') {
            this.triggerCallAnimation();
            this.showTokenCalledNotification();
          }
        },
        error: (error) => {
          console.error('Error refreshing token status:', error);
        }
      });
  }

  private updateQueueProgress(): void {
    if (!this.tokenStatus) return;
    
    // Calculate progress based on queue position
    // Assuming a typical queue has 20-30 people
    const totalEstimatedQueue = Math.max(this.tokenStatus.queuePosition + 10, 20);
    const currentPosition = totalEstimatedQueue - this.tokenStatus.queuePosition;
    this.queueProgress = Math.min((currentPosition / totalEstimatedQueue) * 100, 95);
  }

  private updateEstimatedWaitTime(): void {
    if (!this.tokenStatus) return;
    
    const minutes = this.tokenStatus.estimatedWaitTime;
    if (minutes < 1) {
      this.estimatedWaitTime = 'Any moment now';
    } else if (minutes < 60) {
      this.estimatedWaitTime = `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      this.estimatedWaitTime = `${hours}h ${remainingMinutes}m`;
    }
  }

  private triggerCallAnimation(): void {
    this.isTokenCalled = true;
    this.showCallAnimation = true;
    
    // Reset animation after 3 seconds
    setTimeout(() => {
      this.showCallAnimation = false;
    }, 3000);
  }

  private showTokenCalledNotification(): void {
    this.snackBar.open('🔔 Your token has been called! Please proceed to the consultation room.', 'OK', {
      duration: 10000,
      panelClass: ['token-called-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  getStatusColor(): string {
    if (!this.tokenStatus) return 'primary';
    
    switch (this.tokenStatus.status) {
      case 'WAITING':
        return 'primary';
      case 'CALLED':
        return 'accent';
      case 'IN_CONSULTATION':
        return 'warn';
      case 'COMPLETED':
        return 'primary';
      default:
        return 'primary';
    }
  }

  getStatusIcon(): string {
    if (!this.tokenStatus) return 'help';
    
    switch (this.tokenStatus.status) {
      case 'WAITING':
        return 'hourglass_empty';
      case 'CALLED':
        return 'notification_important';
      case 'IN_CONSULTATION':
        return 'medical_services';
      case 'COMPLETED':
        return 'check_circle';
      default:
        return 'help';
    }
  }

  getStatusMessage(): string {
    if (!this.tokenStatus) return '';
    
    switch (this.tokenStatus.status) {
      case 'WAITING':
        return 'Please wait for your turn. You will be notified when called.';
      case 'CALLED':
        return '🔔 Your token has been called! Please proceed to the consultation room.';
      case 'IN_CONSULTATION':
        return 'You are currently in consultation with the doctor.';
      case 'COMPLETED':
        return 'Your consultation has been completed. Thank you for visiting!';
      default:
        return 'Unknown status';
    }
  }

  getProgressColor(): string {
    if (this.queueProgress < 30) return 'warn';
    if (this.queueProgress < 70) return 'accent';
    return 'primary';
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  getLastUpdatedText(): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - this.lastUpdated.getTime()) / 1000);
    
    if (diffInSeconds < 30) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  }

  refreshStatus(): void {
    this.refreshTokenStatus();
    this.snackBar.open('Status refreshed', '', { duration: 1000 });
  }

  getQueuePositionText(): string {
    if (!this.tokenStatus) return '';
    
    const position = this.tokenStatus.queuePosition;
    if (position === 0) return 'Next in line!';
    if (position === 1) return '1 person ahead';
    return `${position} people ahead`;
  }

  shouldShowCallAnimation(): boolean {
    return this.showCallAnimation && this.tokenStatus?.status === 'CALLED';
  }

  shouldPulse(): boolean {
    return this.tokenStatus?.status === 'CALLED' || this.tokenStatus?.status === 'IN_CONSULTATION';
  }
}