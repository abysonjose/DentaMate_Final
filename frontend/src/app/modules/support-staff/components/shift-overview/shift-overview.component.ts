import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SupportStaffService, ShiftInfo } from '../../services/support-staff.service';

@Component({
  selector: 'app-shift-overview',
  templateUrl: './shift-overview.component.html',
  styleUrls: ['./shift-overview.component.scss']
})
export class ShiftOverviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  shiftInfo: ShiftInfo | null = null;
  currentTime = new Date();
  timeInterval: any;

  constructor(private supportStaffService: SupportStaffService) {}

  ngOnInit(): void {
    this.loadShiftInfo();
    this.startTimeUpdater();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private loadShiftInfo(): void {
    this.supportStaffService.getShiftInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(shiftInfo => {
        this.shiftInfo = shiftInfo;
      });
  }

  private startTimeUpdater(): void {
    this.timeInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  clockIn(): void {
    this.supportStaffService.clockIn()
      .pipe(takeUntil(this.destroy$))
      .subscribe(shiftInfo => {
        this.shiftInfo = shiftInfo;
      });
  }

  clockOut(): void {
    this.supportStaffService.clockOut()
      .pipe(takeUntil(this.destroy$))
      .subscribe(shiftInfo => {
        this.shiftInfo = shiftInfo;
      });
  }

  getShiftProgress(): number {
    if (!this.shiftInfo || !this.shiftInfo.clockedIn) return 0;
    
    const now = new Date();
    const shiftStart = new Date(this.shiftInfo.clockedIn);
    const shiftEnd = new Date(this.shiftInfo.shiftEnd);
    
    const totalDuration = shiftEnd.getTime() - shiftStart.getTime();
    const elapsed = now.getTime() - shiftStart.getTime();
    
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }

  getRemainingShiftTime(): string {
    if (!this.shiftInfo) return '0h 0m';
    
    const now = new Date();
    const shiftEnd = new Date(this.shiftInfo.shiftEnd);
    const remaining = shiftEnd.getTime() - now.getTime();
    
    if (remaining <= 0) return 'Shift Ended';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  getWorkedTime(): string {
    if (!this.shiftInfo || !this.shiftInfo.clockedIn) return '0h 0m';
    
    const now = new Date();
    const clockedIn = new Date(this.shiftInfo.clockedIn);
    const worked = now.getTime() - clockedIn.getTime();
    
    const hours = Math.floor(worked / (1000 * 60 * 60));
    const minutes = Math.floor((worked % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  getShiftDuration(): string {
    if (!this.shiftInfo) return '0h 0m';
    
    const shiftStart = new Date(this.shiftInfo.shiftStart);
    const shiftEnd = new Date(this.shiftInfo.shiftEnd);
    const duration = shiftEnd.getTime() - shiftStart.getTime();
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  isOnBreak(): boolean {
    return this.shiftInfo?.breakStatus === 'ON_BREAK';
  }

  getRoleDisplayName(role: string): string {
    switch (role) {
      case 'HOUSEKEEPING': return 'Housekeeping Staff';
      case 'SECURITY': return 'Security Personnel';
      case 'ATTENDANT': return 'Hospital Attendant';
      default: return role;
    }
  }
}