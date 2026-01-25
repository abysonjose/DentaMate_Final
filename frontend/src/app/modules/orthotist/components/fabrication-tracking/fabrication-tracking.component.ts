import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { OrthotistService, OrthodonticCase, FabricationStage } from '../../services/orthotist.service';
import { FabricationUpdateDialogComponent } from '../../dialogs/fabrication-update-dialog/fabrication-update-dialog.component';

@Component({
  selector: 'app-fabrication-tracking',
  templateUrl: './fabrication-tracking.component.html',
  styleUrls: ['./fabrication-tracking.component.scss']
})
export class FabricationTrackingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  fabricationCases: OrthodonticCase[] = [];
  loading = true;
  
  // Filter options
  statusFilter = '';
  priorityFilter = '';
  
  statusOptions = [
    { value: '', label: 'All Stages' },
    { value: 'MATERIAL_PREP', label: 'Material Preparation' },
    { value: 'SHAPING', label: 'Shaping' },
    { value: 'QUALITY_CHECK', label: 'Quality Check' },
    { value: 'FINISHING', label: 'Finishing' }
  ];
  
  priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' }
  ];

  constructor(
    private orthotistService: OrthotistService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadFabricationCases();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFabricationCases(): void {
    this.loading = true;
    
    this.orthotistService.getCases()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cases) => {
          // Filter cases that are in fabrication
          this.fabricationCases = cases.filter(c => 
            c.status === 'IN_FABRICATION' || c.status === 'IN_MEASUREMENT_REVIEW'
          );
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading fabrication cases:', error);
          this.loading = false;
        }
      });
  }

  applyFilters(): void {
    let filteredCases = [...this.fabricationCases];
    
    if (this.priorityFilter) {
      filteredCases = filteredCases.filter(c => c.priority === this.priorityFilter);
    }
    
    // Additional filtering logic can be added here
    this.fabricationCases = filteredCases;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.priorityFilter = '';
    this.loadFabricationCases();
  }

  updateFabrication(caseData: OrthodonticCase): void {
    const dialogRef = this.dialog.open(FabricationUpdateDialogComponent, {
      width: '600px',
      data: { case: caseData }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.updated) {
        this.loadFabricationCases();
      }
    });
  }

  startFabrication(caseId: string): void {
    this.orthotistService.updateCaseStatus(caseId, 'IN_FABRICATION')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadFabricationCases();
        },
        error: (error) => {
          console.error('Error starting fabrication:', error);
        }
      });
  }

  markStageComplete(caseId: string, stageId: string): void {
    const updateData = {
      status: 'COMPLETED',
      completedAt: new Date()
    };
    
    this.orthotistService.updateFabricationStage(caseId, stageId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadFabricationCases();
        },
        error: (error) => {
          console.error('Error updating stage:', error);
        }
      });
  }

  getStatusColor(status: string): string {
    return this.orthotistService.getCaseStatusColor(status);
  }

  getPriorityColor(priority: string): string {
    return this.orthotistService.getPriorityColor(priority);
  }

  getStageStatusColor(status: string): string {
    const colors = {
      'PENDING': '#757575',
      'IN_PROGRESS': '#2196F3',
      'COMPLETED': '#4CAF50',
      'ON_HOLD': '#FF9800'
    };
    return colors[status] || '#757575';
  }

  getFabricationProgress(caseData: OrthodonticCase): number {
    if (!caseData.fabricationStages) return 0;
    
    const completedStages = caseData.fabricationStages.filter(s => s.status === 'COMPLETED').length;
    const totalStages = caseData.fabricationStages.length;
    
    return totalStages > 0 ? (completedStages / totalStages) * 100 : 0;
  }

  isOverdue(estimatedDate: Date | undefined): boolean {
    if (!estimatedDate) return false;
    return new Date(estimatedDate) < new Date();
  }

  refreshData(): void {
    this.loadFabricationCases();
  }
}