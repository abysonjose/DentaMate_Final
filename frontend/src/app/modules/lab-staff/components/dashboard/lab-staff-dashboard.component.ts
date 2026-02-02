import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LabStaffService } from '../../services/lab-staff.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { TestResultDialogComponent } from '../../dialogs/test-result-dialog/test-result-dialog.component';
import { SampleCollectionDialogComponent } from '../../dialogs/sample-collection-dialog/sample-collection-dialog.component';

@Component({
  selector: 'app-lab-staff-dashboard',
  templateUrl: './lab-staff-dashboard.component.html',
  styleUrls: ['./lab-staff-dashboard.component.scss']
})
export class LabStaffDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: any;
  pendingTests: any[] = [];
  inProgressTests: any[] = [];
  completedTests: any[] = [];
  sampleCollection: any[] = [];
  isLoading = false;

  constructor(
    private labStaffService: LabStaffService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadDashboardData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    
    // Load pending tests
    this.labStaffService.getPendingTests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.pendingTests = response.data || [];
        },
        error: (error) => {
          console.error('Error loading pending tests:', error);
        }
      });

    // Load in-progress tests
    this.labStaffService.getInProgressTests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.inProgressTests = response.data || [];
        },
        error: (error) => {
          console.error('Error loading in-progress tests:', error);
        }
      });

    // Load completed tests
    this.labStaffService.getCompletedTests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.completedTests = response.data || [];
        },
        error: (error) => {
          console.error('Error loading completed tests:', error);
        }
      });

    // Load sample collection queue
    this.labStaffService.getSampleCollectionQueue()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.sampleCollection = response.data || [];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading sample collection queue:', error);
          this.isLoading = false;
        }
      });
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  startTest(test: any): void {
    this.labStaffService.startTest(test.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadDashboardData(); // Refresh data
          }
        },
        error: (error) => {
          console.error('Error starting test:', error);
        }
      });
  }

  enterTestResult(test: any): void {
    const dialogRef = this.dialog.open(TestResultDialogComponent, {
      width: '700px',
      data: { 
        testId: test.id,
        testName: test.testName,
        patientName: test.patientName
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDashboardData(); // Refresh data
      }
    });
  }

  collectSample(sample: any): void {
    const dialogRef = this.dialog.open(SampleCollectionDialogComponent, {
      width: '600px',
      data: { 
        sampleId: sample.id,
        patientName: sample.patientName,
        testName: sample.testName
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDashboardData(); // Refresh data
      }
    });
  }

  getTestStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending': return 'accent';
      case 'in-progress': return 'primary';
      case 'completed': return '';
      case 'cancelled': return 'warn';
      default: return '';
    }
  }

  getTestPriorityColor(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'warn';
      case 'high': return 'accent';
      case 'normal': return 'primary';
      default: return '';
    }
  }

  getTestTypeIcon(testType: string): string {
    switch (testType?.toLowerCase()) {
      case 'blood': return 'bloodtype';
      case 'urine': return 'science';
      case 'xray': return 'medical_services';
      case 'ct': return 'scanner';
      case 'mri': return 'psychology';
      case 'ultrasound': return 'monitor_heart';
      default: return 'biotech';
    }
  }
}