import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { HeadNurseService, ComplianceChecklist } from '../../services/head-nurse.service';
import { ComplianceChecklistDialogComponent } from '../../dialogs/compliance-checklist-dialog/compliance-checklist-dialog.component';

@Component({
  selector: 'app-compliance-tracking',
  templateUrl: './compliance-tracking.component.html',
  styleUrls: ['./compliance-tracking.component.scss']
})
export class ComplianceTrackingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  complianceChecklists: ComplianceChecklist[] = [];
  
  displayedColumns: string[] = ['category', 'completionStatus', 'completedBy', 'completedAt', 'actions'];
  
  complianceMetrics = {
    totalChecklists: 0,
    completedToday: 0,
    pendingChecklists: 0,
    overdueChecklists: 0,
    complianceRate: 0
  };

  categoryOptions = [
    { 
      value: 'ppe_usage', 
      label: 'PPE Usage', 
      icon: 'security',
      description: 'Personal Protective Equipment compliance'
    },
    { 
      value: 'sterilization', 
      label: 'Sterilization', 
      icon: 'cleaning_services',
      description: 'Instrument and equipment sterilization'
    },
    { 
      value: 'waste_disposal', 
      label: 'Waste Disposal', 
      icon: 'delete',
      description: 'Medical waste disposal procedures'
    },
    { 
      value: 'room_preparation', 
      label: 'Room Preparation', 
      icon: 'room_service',
      description: 'Treatment room setup and cleaning'
    }
  ];

  constructor(
    private headNurseService: HeadNurseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadComplianceChecklists();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadComplianceChecklists(): void {
    this.headNurseService.getComplianceChecklists()
      .pipe(takeUntil(this.destroy$))
      .subscribe(checklists => {
        this.complianceChecklists = checklists;
        this.updateMetrics();
      });
  }

  private updateMetrics(): void {
    this.complianceMetrics.totalChecklists = this.complianceChecklists.length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.complianceMetrics.completedToday = this.complianceChecklists.filter(c => 
      c.status === 'completed' && c.completedAt && new Date(c.completedAt) >= today
    ).length;
    
    this.complianceMetrics.pendingChecklists = this.complianceChecklists.filter(c => 
      c.status === 'pending'
    ).length;
    
    this.complianceMetrics.overdueChecklists = this.complianceChecklists.filter(c => 
      c.status === 'overdue'
    ).length;
    
    const completedChecklists = this.complianceChecklists.filter(c => c.status === 'completed').length;
    this.complianceMetrics.complianceRate = this.complianceChecklists.length > 0 
      ? Math.round((completedChecklists / this.complianceChecklists.length) * 100)
      : 0;
  }

  openComplianceChecklist(checklist: ComplianceChecklist): void {
    const dialogRef = this.dialog.open(ComplianceChecklistDialogComponent, {
      width: '700px',
      data: { checklist }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.headNurseService.updateComplianceChecklist(checklist.id, result)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Compliance checklist updated successfully', 'Close', { duration: 3000 });
              this.loadComplianceChecklists();
            },
            error: (error) => {
              this.snackBar.open('Failed to update compliance checklist', 'Close', { duration: 3000 });
            }
          });
      }
    });
  }

  getStatusColor(status: string): string {
    const colors = {
      'pending': 'accent',
      'completed': 'primary',
      'overdue': 'warn'
    };
    return colors[status] || 'basic';
  }

  getStatusIcon(status: string): string {
    const icons = {
      'pending': 'schedule',
      'completed': 'check_circle',
      'overdue': 'error'
    };
    return icons[status] || 'help';
  }

  getCategoryIcon(category: string): string {
    const categoryOption = this.categoryOptions.find(opt => opt.value === category);
    return categoryOption?.icon || 'fact_check';
  }

  getCompletionPercentage(checklist: ComplianceChecklist): number {
    if (!checklist.items || checklist.items.length === 0) return 0;
    
    const completedItems = checklist.items.filter(item => item.completed).length;
    return Math.round((completedItems / checklist.items.length) * 100);
  }

  getCompletionColor(percentage: number): string {
    if (percentage === 100) return 'primary';
    if (percentage >= 75) return 'accent';
    if (percentage >= 50) return 'warn';
    return 'warn';
  }

  refreshData(): void {
    this.loadComplianceChecklists();
  }
}