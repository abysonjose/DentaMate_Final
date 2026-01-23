import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { NurseService } from '../../services/nurse.service';
import { ClinicalMessage, TaskAssignment, PatientHandoff, ClinicalAlert } from '../../../../shared/services/clinical-integration.service';
import { SendMessageDialogComponent } from '../../dialogs/send-message-dialog/send-message-dialog.component';

@Component({
  selector: 'app-clinical-communication',
  templateUrl: './clinical-communication.component.html',
  styleUrls: ['./clinical-communication.component.scss']
})
export class ClinicalCommunicationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  messages: ClinicalMessage[] = [];
  tasks: TaskAssignment[] = [];
  handoffs: PatientHandoff[] = [];
  alerts: ClinicalAlert[] = [];
  
  selectedTab = 0;
  isLoading = true;

  // Filter options
  messageFilter = 'all';
  taskFilter = 'pending';
  handoffFilter = 'pending';
  alertFilter = 'active';

  constructor(
    private nurseService: NurseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCommunicationData();
    this.subscribeToRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCommunicationData(): void {
    // Load messages
    this.nurseService.getClinicalMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading messages:', error);
          this.isLoading = false;
        }
      });

    // Load tasks
    this.nurseService.getTaskAssignments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.tasks = tasks.filter(t => t.assignedToRole === 'nurse');
        },
        error: (error) => {
          console.error('Error loading tasks:', error);
        }
      });

    // Load handoffs
    this.nurseService.getPatientHandoffs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (handoffs) => {
          this.handoffs = handoffs.filter(h => h.toRole === 'nurse' || h.fromRole === 'nurse');
        },
        error: (error) => {
          console.error('Error loading handoffs:', error);
        }
      });

    // Load alerts
    this.nurseService.getClinicalAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          this.alerts = alerts.filter(a => a.targetRoles.includes('nurse'));
        },
        error: (error) => {
          console.error('Error loading alerts:', error);
        }
      });
  }

  private subscribeToRealTimeUpdates(): void {
    // Subscribe to real-time updates
    this.nurseService.getClinicalMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messages = messages;
      });

    this.nurseService.getTaskAssignments()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => {
        this.tasks = tasks.filter(t => t.assignedToRole === 'nurse');
      });

    this.nurseService.getPatientHandoffs()
      .pipe(takeUntil(this.destroy$))
      .subscribe(handoffs => {
        this.handoffs = handoffs.filter(h => h.toRole === 'nurse' || h.fromRole === 'nurse');
      });

    this.nurseService.getClinicalAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts.filter(a => a.targetRoles.includes('nurse'));
      });
  }

  // Message Actions
  openSendMessageDialog(): void {
    const dialogRef = this.dialog.open(SendMessageDialogComponent, {
      width: '500px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.sendMessage(result);
      }
    });
  }

  private sendMessage(messageData: any): void {
    if (messageData.recipientRole === 'doctor') {
      this.nurseService.sendMessageToDoctor(
        messageData.recipientId,
        messageData.subject,
        messageData.message,
        messageData.patientId,
        messageData.messageType
      ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Message sent successfully', 'Close', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.snackBar.open('Error sending message', 'Close', { duration: 3000 });
        }
      });
    } else if (messageData.recipientRole === 'head-nurse') {
      this.nurseService.sendMessageToHeadNurse(
        messageData.recipientId,
        messageData.subject,
        messageData.message,
        messageData.patientId,
        messageData.messageType
      ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Message sent successfully', 'Close', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.snackBar.open('Error sending message', 'Close', { duration: 3000 });
        }
      });
    }
  }

  markMessageAsRead(messageId: string): void {
    // Implementation would call the clinical integration service
    this.snackBar.open('Message marked as read', 'Close', { duration: 1000 });
  }

  // Task Actions
  acceptTask(taskId: string): void {
    this.nurseService.updateTaskStatus(taskId, 'in-progress')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Task accepted', 'Close', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error accepting task:', error);
          this.snackBar.open('Error accepting task', 'Close', { duration: 3000 });
        }
      });
  }

  completeTask(taskId: string): void {
    this.nurseService.updateTaskStatus(taskId, 'completed')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Task completed', 'Close', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error completing task:', error);
          this.snackBar.open('Error completing task', 'Close', { duration: 3000 });
        }
      });
  }

  // Handoff Actions
  acknowledgeHandoff(handoffId: string): void {
    this.nurseService.acknowledgeHandoff(handoffId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Handoff acknowledged', 'Close', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error acknowledging handoff:', error);
          this.snackBar.open('Error acknowledging handoff', 'Close', { duration: 3000 });
        }
      });
  }

  completeHandoff(handoffId: string): void {
    this.nurseService.completeHandoff(handoffId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Handoff completed', 'Close', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error completing handoff:', error);
          this.snackBar.open('Error completing handoff', 'Close', { duration: 3000 });
        }
      });
  }

  // Alert Actions
  acknowledgeAlert(alertId: string): void {
    // Implementation would call the clinical integration service
    this.snackBar.open('Alert acknowledged', 'Close', { duration: 2000 });
  }

  // Filter Methods
  getFilteredMessages(): ClinicalMessage[] {
    switch (this.messageFilter) {
      case 'unread':
        return this.messages.filter(m => !m.read);
      case 'urgent':
        return this.messages.filter(m => m.messageType === 'urgent');
      default:
        return this.messages;
    }
  }

  getFilteredTasks(): TaskAssignment[] {
    switch (this.taskFilter) {
      case 'pending':
        return this.tasks.filter(t => t.status === 'pending');
      case 'in-progress':
        return this.tasks.filter(t => t.status === 'in-progress');
      case 'urgent':
        return this.tasks.filter(t => t.priority === 'urgent');
      default:
        return this.tasks;
    }
  }

  getFilteredHandoffs(): PatientHandoff[] {
    switch (this.handoffFilter) {
      case 'pending':
        return this.handoffs.filter(h => h.status === 'pending');
      case 'acknowledged':
        return this.handoffs.filter(h => h.status === 'acknowledged');
      default:
        return this.handoffs;
    }
  }

  getFilteredAlerts(): ClinicalAlert[] {
    switch (this.alertFilter) {
      case 'active':
        return this.alerts.filter(a => !a.acknowledged);
      case 'emergency':
        return this.alerts.filter(a => a.priority === 'emergency');
      default:
        return this.alerts;
    }
  }

  // Utility Methods
  getMessageTypeColor(type: string): string {
    switch (type) {
      case 'urgent': return 'warn';
      case 'request': return 'accent';
      default: return 'primary';
    }
  }

  getTaskPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'warn';
      case 'high': return 'accent';
      default: return 'primary';
    }
  }

  getHandoffTypeColor(type: string): string {
    switch (type) {
      case 'emergency': return 'warn';
      case 'assistance-needed': return 'accent';
      default: return 'primary';
    }
  }

  getAlertPriorityColor(priority: string): string {
    switch (priority) {
      case 'emergency': return 'warn';
      case 'urgent': return 'accent';
      default: return 'primary';
    }
  }

  refreshData(): void {
    this.isLoading = true;
    this.loadCommunicationData();
  }
}