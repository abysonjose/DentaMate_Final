import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrthotistService, OrthodonticCase, FabricationStage } from '../../services/orthotist.service';

@Component({
  selector: 'app-fabrication-update-dialog',
  templateUrl: './fabrication-update-dialog.component.html',
  styleUrls: ['./fabrication-update-dialog.component.scss']
})
export class FabricationUpdateDialogComponent implements OnInit {
  case: OrthodonticCase;
  fabricationStages: FabricationStage[] = [];
  
  stageUpdateForm: FormGroup;
  noteForm: FormGroup;
  
  loading = false;
  
  stageOptions = [
    { value: 'MATERIAL_PREP', label: 'Material Preparation' },
    { value: 'SHAPING', label: 'Shaping' },
    { value: 'QUALITY_CHECK', label: 'Quality Check' },
    { value: 'FINISHING', label: 'Finishing' }
  ];
  
  statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'ON_HOLD', label: 'On Hold' }
  ];

  constructor(
    public dialogRef: MatDialogRef<FabricationUpdateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private orthotistService: OrthotistService
  ) {
    this.case = data.case;
    
    this.stageUpdateForm = this.fb.group({
      stageId: ['', Validators.required],
      status: ['', Validators.required],
      notes: ['']
    });
    
    this.noteForm = this.fb.group({
      stageId: ['', Validators.required],
      note: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadFabricationStages();
  }

  loadFabricationStages(): void {
    this.loading = true;
    
    this.orthotistService.getFabricationStages(this.case.id).subscribe({
      next: (stages) => {
        this.fabricationStages = stages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading fabrication stages:', error);
        this.loading = false;
      }
    });
  }

  updateStage(): void {
    if (this.stageUpdateForm.valid) {
      const formData = this.stageUpdateForm.value;
      const updateData: Partial<FabricationStage> = {
        status: formData.status,
        notes: formData.notes
      };
      
      if (formData.status === 'IN_PROGRESS' && !this.getStage(formData.stageId)?.startedAt) {
        updateData.startedAt = new Date();
      }
      
      if (formData.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
      
      this.orthotistService.updateFabricationStage(this.case.id, formData.stageId, updateData).subscribe({
        next: () => {
          this.loadFabricationStages();
          this.stageUpdateForm.reset();
        },
        error: (error) => {
          console.error('Error updating stage:', error);
        }
      });
    }
  }

  addNote(): void {
    if (this.noteForm.valid) {
      const formData = this.noteForm.value;
      
      this.orthotistService.addFabricationNote(this.case.id, formData.stageId, formData.note).subscribe({
        next: () => {
          this.loadFabricationStages();
          this.noteForm.reset();
        },
        error: (error) => {
          console.error('Error adding note:', error);
        }
      });
    }
  }

  markAllComplete(): void {
    const incompleteStages = this.fabricationStages.filter(s => s.status !== 'COMPLETED');
    
    incompleteStages.forEach(stage => {
      const updateData: Partial<FabricationStage> = {
        status: 'COMPLETED',
        completedAt: new Date()
      };
      
      this.orthotistService.updateFabricationStage(this.case.id, stage.id, updateData).subscribe({
        next: () => {
          this.loadFabricationStages();
        },
        error: (error) => {
          console.error('Error updating stage:', error);
        }
      });
    });
  }

  markCaseReady(): void {
    this.orthotistService.markAsReady(this.case.id).subscribe({
      next: () => {
        this.dialogRef.close({ updated: true, caseReady: true });
      },
      error: (error) => {
        console.error('Error marking case as ready:', error);
      }
    });
  }

  getStage(stageId: string): FabricationStage | undefined {
    return this.fabricationStages.find(s => s.id === stageId);
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

  getCompletionPercentage(): number {
    if (this.fabricationStages.length === 0) return 0;
    
    const completedStages = this.fabricationStages.filter(s => s.status === 'COMPLETED').length;
    return (completedStages / this.fabricationStages.length) * 100;
  }

  canMarkReady(): boolean {
    return this.fabricationStages.every(s => s.status === 'COMPLETED');
  }

  onClose(): void {
    this.dialogRef.close({ updated: true });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}