import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InsuranceService, InsuranceClaim, ClaimStatus, Communication, CommunicationType } from '../../services/insurance.service';

@Component({
  selector: 'app-claim-details-dialog',
  templateUrl: './claim-details-dialog.component.html',
  styleUrls: ['./claim-details-dialog.component.scss']
})
export class ClaimDetailsDialogComponent implements OnInit {
  claim: InsuranceClaim | null = null;
  communications: Communication[] = [];
  documents: any[] = [];
  loading = true;
  
  // Forms
  statusUpdateForm: FormGroup;
  communicationForm: FormGroup;
  
  // UI State
  selectedTab = 0;
  canUpdateStatus = true;
  
  statusOptions = Object.values(ClaimStatus);
  communicationTypes = Object.values(CommunicationType);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { claimId: string },
    private dialogRef: MatDialogRef<ClaimDetailsDialogComponent>,
    private fb: FormBuilder,
    private insuranceService: InsuranceService,
    private snackBar: MatSnackBar
  ) {
    this.statusUpdateForm = this.createStatusUpdateForm();
    this.communicationForm = this.createCommunicationForm();
  }

  ngOnInit(): void {
    this.loadClaimDetails();
  }

  private createStatusUpdateForm(): FormGroup {
    return this.fb.group({
      status: ['', Validators.required],
      approvedAmount: [''],
      rejectionReason: [''],
      notes: ['']
    });
  }

  private createCommunicationForm(): FormGroup {
    return this.fb.group({
      type: ['', Validators.required],
      direction: ['OUTBOUND', Validators.required],
      subject: ['', Validators.required],
      content: ['', Validators.required],
      contactPerson: [''],
      followUpRequired: [false],
      followUpDate: ['']
    });
  }

  private loadClaimDetails(): void {
    this.loading = true;
    
    this.insuranceService.getClaimById(this.data.claimId).subscribe({
      next: (claim) => {
        this.claim = claim;
        this.populateStatusForm(claim);
        this.loadCommunications();
        this.loadDocuments();
      },
      error: (error) => {
        console.error('Error loading claim details:', error);
        this.loading = false;
      }
    });
  }

  private populateStatusForm(claim: InsuranceClaim): void {
    this.statusUpdateForm.patchValue({
      status: claim.status,
      approvedAmount: claim.approvedAmount,
      rejectionReason: claim.rejectionReason
    });
  }

  private loadCommunications(): void {
    this.insuranceService.getCommunications(this.data.claimId).subscribe({
      next: (communications) => {
        this.communications = communications.sort((a, b) => 
          new Date(b.communicationDate).getTime() - new Date(a.communicationDate).getTime()
        );
      },
      error: (error) => {
        console.error('Error loading communications:', error);
      }
    });
  }

  private loadDocuments(): void {
    this.insuranceService.getClaimDocuments(this.data.claimId).subscribe({
      next: (documents) => {
        this.documents = documents;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.loading = false;
      }
    });
  }

  onStatusUpdate(): void {
    if (this.statusUpdateForm.valid && this.claim) {
      const updates = this.statusUpdateForm.value;
      
      this.insuranceService.updateClaim(this.claim.id, updates).subscribe({
        next: (updatedClaim) => {
          this.claim = updatedClaim;
          this.snackBar.open('Claim status updated successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('Error updating claim status:', error);
          this.snackBar.open('Error updating claim status', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  onAddCommunication(): void {
    if (this.communicationForm.valid && this.claim) {
      const communication = {
        ...this.communicationForm.value,
        claimId: this.claim.id,
        communicationDate: new Date(),
        createdBy: 'current-user-id' // Should come from auth service
      };

      this.insuranceService.addCommunication(this.claim.id, communication).subscribe({
        next: (newCommunication) => {
          this.communications.unshift(newCommunication);
          this.communicationForm.reset();
          this.communicationForm.patchValue({ direction: 'OUTBOUND' });
          this.snackBar.open('Communication logged successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('Error adding communication:', error);
          this.snackBar.open('Error logging communication', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  downloadDocument(document: any): void {
    this.insuranceService.downloadDocument(document.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = document.fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading document:', error);
        this.snackBar.open('Error downloading document', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  getStatusColor(status: ClaimStatus): string {
    return this.insuranceService.getClaimStatusColor(status);
  }

  getStatusIcon(status: ClaimStatus): string {
    return this.insuranceService.getClaimStatusIcon(status);
  }

  getCommunicationIcon(type: CommunicationType): string {
    const icons = {
      [CommunicationType.EMAIL]: 'email',
      [CommunicationType.PHONE]: 'phone',
      [CommunicationType.PORTAL]: 'web',
      [CommunicationType.FAX]: 'fax'
    };
    return icons[type] || 'chat';
  }

  onClose(): void {
    this.dialogRef.close({ updated: true });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}