import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { NurseService, QueueStatus, Patient, Doctor } from '../../services/nurse.service';

@Component({
  selector: 'app-queue-awareness',
  templateUrl: './queue-awareness.component.html',
  styleUrls: ['./queue-awareness.component.scss']
})
export class QueueAwarenessComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  queueStatus: QueueStatus[] = [];
  assignedDoctors: Doctor[] = [];
  isLoading = true;
  currentTime = new Date();

  constructor(private nurseService: NurseService) {}

  ngOnInit(): void {
    this.loadQueueData();
    this.subscribeToUpdates();
    this.startTimeUpdater();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadQueueData(): void {
    // Load queue status
    this.nurseService.getQueueStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.queueStatus = status;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading queue status:', error);
          this.isLoading = false;
        }
      });

    // Load current shift to get assigned doctors
    this.nurseService.getCurrentShift()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shift) => {
          if (shift) {
            this.assignedDoctors = shift.assignedDoctors;
          }
        },
        error: (error) => {
          console.error('Error loading shift data:', error);
        }
      });
  }

  private subscribeToUpdates(): void {
    this.nurseService.queueStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.queueStatus = status;
      });
  }

  private startTimeUpdater(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
      });
  }

  getDoctorById(doctorId: string): Doctor | undefined {
    return this.assignedDoctors.find(doctor => doctor.id === doctorId);
  }

  getQueueStatusColor(waitingCount: number): string {
    if (waitingCount === 0) return 'primary';
    if (waitingCount <= 3) return 'accent';
    if (waitingCount <= 6) return 'warn';
    return 'warn';
  }

  getWaitTimeColor(waitTime: number): string {
    if (waitTime <= 15) return 'primary';
    if (waitTime <= 30) return 'accent';
    return 'warn';
  }

  formatWaitTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  getTotalPatientsWaiting(): number {
    return this.queueStatus.reduce((total, queue) => total + queue.waitingCount, 0);
  }

  getAverageWaitTime(): number {
    if (this.queueStatus.length === 0) return 0;
    const totalWaitTime = this.queueStatus.reduce((total, queue) => total + queue.estimatedWaitTime, 0);
    return Math.round(totalWaitTime / this.queueStatus.length);
  }

  getLongestQueue(): QueueStatus | null {
    if (this.queueStatus.length === 0) return null;
    return this.queueStatus.reduce((longest, current) => 
      current.waitingCount > longest.waitingCount ? current : longest
    );
  }

  refreshData(): void {
    this.isLoading = true;
    this.loadQueueData();
  }

  getCurrentTimeString(): string {
    return this.currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
}