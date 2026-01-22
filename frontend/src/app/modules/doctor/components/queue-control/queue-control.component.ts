import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DoctorQueueService, QueueToken, QueueSnapshot, QueueStats } from '../../services/doctor-queue.service';

@Component({
  selector: 'app-queue-control',
  templateUrl: './queue-control.component.html',
  styleUrls: ['./queue-control.component.scss']
})
export class QueueControlComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  queueSnapshot: QueueSnapshot = {
    currentToken: '',
    nextTokens: [],
    estimatedWaitTime: 0,
    status: 'active',
    totalWaiting: 0,
    averageWaitTime: 0,
    lastUpdated: new Date()
  };

  waitingTokens: QueueToken[] = [];
  skippedTokens: QueueToken[] = [];
  completedTokens: QueueToken[] = [];
  currentToken: QueueToken | null = null;
  queueStats: QueueStats | null = null;

  isLoading = true;
  selectedTab = 0;

  displayedColumns = ['tokenNumber', 'patientName', 'type', 'priority', 'waitTime', 'actions'];
  skippedColumns = ['tokenNumber', 'patientName', 'skipReason', 'actions'];
  completedColumns = ['tokenNumber', 'patientName', 'consultationTime', 'duration'];

  constructor(
    private queueService: DoctorQueueService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadQueueData();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadQueueData(): void {
    this.isLoading = true;

    // Load queue snapshot
    this.queueService.getCurrentQueueSnapshot()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snapshot) => {
          this.queueSnapshot = snapshot;
        },
        error: (error) => console.error('Error loading queue snapshot:', error)
      });

    // Load current token
    this.queueService.getCurrentToken()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (token) => {
          this.currentToken = token;
        },
        error: (error) => console.error('Error loading current token:', error)
      });

    // Load waiting tokens
    this.queueService.getWaitingTokens()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokens) => {
          this.waitingTokens = tokens;
        },
        error: (error) => console.error('Error loading waiting tokens:', error)
      });

    // Load skipped tokens
    this.queueService.getSkippedTokens()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokens) => {
          this.skippedTokens = tokens;
        },
        error: (error) => console.error('Error loading skipped tokens:', error)
      });

    // Load completed tokens
    this.queueService.getCompletedTokens()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tokens) => {
          this.completedTokens = tokens;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading completed tokens:', error);
          this.isLoading = false;
        }
      });

    // Load queue statistics
    this.queueService.getQueueStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.queueStats = stats;
        },
        error: (error) => console.error('Error loading queue stats:', error)
      });
  }

  private setupRealTimeUpdates(): void {
    this.queueService.getQueueUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (update) => {
          this.handleQueueUpdate(update);
        },
        error: (error) => console.error('Error in real-time updates:', error)
      });
  }

  private handleQueueUpdate(update: any): void {
    switch (update.type) {
      case 'token_added':
        this.waitingTokens.push(update.token);
        break;
      case 'token_called':
        this.currentToken = update.token;
        this.removeFromWaiting(update.token.id);
        break;
      case 'token_completed':
        this.completedTokens.unshift(update.token);
        this.currentToken = null;
        break;
      case 'token_skipped':
        this.skippedTokens.push(update.token);
        this.removeFromWaiting(update.token.id);
        break;
      case 'queue_paused':
        this.queueSnapshot.status = 'paused';
        break;
      case 'queue_resumed':
        this.queueSnapshot.status = 'active';
        break;
    }

    if (update.queueSnapshot) {
      this.queueSnapshot = { ...this.queueSnapshot, ...update.queueSnapshot };
    }
  }

  private removeFromWaiting(tokenId: string): void {
    this.waitingTokens = this.waitingTokens.filter(token => token.id !== tokenId);
  }

  // Queue Control Actions
  callNextPatient(): void {
    this.queueService.callNextPatient()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (token) => {
          this.currentToken = token;
          this.removeFromWaiting(token.id);
          this.snackBar.open(`Called ${token.patientName} (${token.tokenNumber})`, 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error calling next patient:', error);
          this.snackBar.open('Error calling next patient', 'Close', { duration: 3000 });
        }
      });
  }

  callSpecificToken(token: QueueToken): void {
    this.queueService.callSpecificToken(token.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (calledToken) => {
          this.currentToken = calledToken;
          this.removeFromWaiting(token.id);
          this.snackBar.open(`Called ${token.patientName} (${token.tokenNumber})`, 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error calling specific token:', error);
          this.snackBar.open('Error calling patient', 'Close', { duration: 3000 });
        }
      });
  }

  skipToken(token: QueueToken): void {
    const reason = prompt('Reason for skipping:');
    if (!reason) return;

    this.queueService.skipToken(token.id, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.removeFromWaiting(token.id);
          this.skippedTokens.push({ ...token, skipReason: reason, status: 'skipped' });
          this.snackBar.open(`Skipped ${token.patientName} (${token.tokenNumber})`, 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error skipping token:', error);
          this.snackBar.open('Error skipping patient', 'Close', { duration: 3000 });
        }
      });
  }

  recallSkippedToken(token: QueueToken): void {
    this.queueService.recallSkippedToken(token.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recalledToken) => {
          this.skippedTokens = this.skippedTokens.filter(t => t.id !== token.id);
          this.waitingTokens.push(recalledToken);
          this.snackBar.open(`Recalled ${token.patientName} (${token.tokenNumber})`, 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error recalling token:', error);
          this.snackBar.open('Error recalling patient', 'Close', { duration: 3000 });
        }
      });
  }

  markNoShow(token: QueueToken): void {
    this.queueService.markTokenNoShow(token.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.removeFromWaiting(token.id);
          this.snackBar.open(`Marked ${token.patientName} as no-show`, 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error marking no-show:', error);
          this.snackBar.open('Error marking no-show', 'Close', { duration: 3000 });
        }
      });
  }

  startConsultation(): void {
    if (!this.currentToken) return;

    this.queueService.startConsultation(this.currentToken.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (token) => {
          this.currentToken = token;
          this.snackBar.open('Consultation started', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error starting consultation:', error);
          this.snackBar.open('Error starting consultation', 'Close', { duration: 3000 });
        }
      });
  }

  completeConsultation(): void {
    if (!this.currentToken) return;

    this.queueService.completeConsultation(this.currentToken.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (token) => {
          this.completedTokens.unshift(token);
          this.currentToken = null;
          this.snackBar.open('Consultation completed', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error completing consultation:', error);
          this.snackBar.open('Error completing consultation', 'Close', { duration: 3000 });
        }
      });
  }

  pauseQueue(): void {
    this.queueService.pauseQueue()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.queueSnapshot.status = 'paused';
          this.snackBar.open('Queue paused', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error pausing queue:', error);
          this.snackBar.open('Error pausing queue', 'Close', { duration: 3000 });
        }
      });
  }

  resumeQueue(): void {
    this.queueService.resumeQueue()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.queueSnapshot.status = 'active';
          this.snackBar.open('Queue resumed', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error resuming queue:', error);
          this.snackBar.open('Error resuming queue', 'Close', { duration: 3000 });
        }
      });
  }

  // Emergency Actions
  insertEmergencyPatient(): void {
    // This would open a dialog to select patient and add emergency reason
    // For now, just a placeholder
    const patientId = prompt('Patient ID for emergency:');
    const reason = prompt('Emergency reason:');
    
    if (!patientId || !reason) return;

    this.queueService.insertEmergencyToken(patientId, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (token) => {
          this.waitingTokens.unshift(token); // Add to front of queue
          this.snackBar.open('Emergency patient added', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error inserting emergency patient:', error);
          this.snackBar.open('Error adding emergency patient', 'Close', { duration: 3000 });
        }
      });
  }

  // Utility Methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'waiting': return 'primary';
      case 'called': return 'accent';
      case 'in-consultation': return 'success';
      case 'completed': return 'success';
      case 'skipped': return 'warn';
      case 'no-show': return 'warn';
      default: return 'primary';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      case 'low': return 'basic';
      default: return 'primary';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'appointment': return 'event';
      case 'walk-in': return 'directions_walk';
      case 'emergency': return 'emergency';
      default: return 'person';
    }
  }

  formatWaitTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  formatDuration(startTime: Date, endTime: Date): string {
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    return this.formatWaitTime(duration);
  }

  refreshQueue(): void {
    this.loadQueueData();
  }
}