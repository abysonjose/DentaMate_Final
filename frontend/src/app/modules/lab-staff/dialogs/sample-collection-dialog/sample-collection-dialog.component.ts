import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LabStaffService } from '../../services/lab-staff.service';

@Component({
  selector: 'app-sample-collection-dialog',
  templateUrl: './sample-collection-dialog.component.html',
  styleUrls: ['./sample-collection-dialog.component.scss']
})
export class SampleCollectionDialogComponent implements OnInit {
  collectionForm: FormGroup;
  isSubmitting = false;

  collectionMethods = [
    { value: 'venipuncture', label: 'Venipuncture' },
    { value: 'fingerstick', label: 'Fingerstick' },
    { value: 'urine-midstream', label: 'Urine - Midstream' },
    { value: 'urine-24hour', label: 'Urine - 24 Hour Collection' },
    { value: 'swab', label: 'Swab' },
    { value: 'sputum', label: 'Sputum' },
    { value: 'biopsy', label: 'Biopsy' },
    { value: 'other', label: 'Other' }
  ];

  storageConditions = [
    { value: 'room-temperature', label: 'Room Temperature' },
    { value: 'refrigerated', label: 'Refrigerated (2-8°C)' },
    { value: 'frozen', label: 'Frozen (-20°C)' },
    { value: 'frozen-ultra', label: 'Ultra Frozen (-80°C)' },
    { value: 'ice', label: 'On Ice' }
  ];

  constructor(
    private fb: FormBuilder,
    private labStaffService: LabStaffService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<SampleCollectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sampleId: string; patientName: string; testName: string }
  ) {
    this.collectionForm = this.fb.group({
      collectionMethod: ['', Validators.required],
      collectionTime: [new Date(), Validators.required],
      collectedBy: ['', Validators.required],
      storageConditions: ['room-temperature', Validators.required],
      notes: [''],
      volumeCollected: [''],
      containerType: [''],
      preservatives: [''],
      collectionSite: [''],
      patientFasting: [false],
      complications: ['']
    });
  }

  ngOnInit(): void {
    // Pre-fill collected by with current user
    // This would typically come from the auth service
    this.collectionForm.patchValue({
      collectedBy: 'Current Lab Staff' // Replace with actual user name
    });
  }

  onSubmit(): void {
    if (this.collectionForm.valid) {
      this.isSubmitting = true;
      
      const sampleCollection = {
        sampleId: this.data.sampleId,
        collectionMethod: this.collectionForm.get('collectionMethod')?.value,
        collectionTime: this.collectionForm.get('collectionTime')?.value.toISOString(),
        collectedBy: this.collectionForm.get('collectedBy')?.value,
        storageConditions: this.collectionForm.get('storageConditions')?.value,
        notes: this.collectionForm.get('notes')?.value,
        volumeCollected: this.collectionForm.get('volumeCollected')?.value,
        containerType: this.collectionForm.get('containerType')?.value,
        preservatives: this.collectionForm.get('preservatives')?.value,
        collectionSite: this.collectionForm.get('collectionSite')?.value,
        patientFasting: this.collectionForm.get('patientFasting')?.value,
        complications: this.collectionForm.get('complications')?.value
      };

      this.labStaffService.collectSample(sampleCollection).subscribe({
        next: (response) => {
          if (response.success) {
            this.dialogRef.close(true);
          } else {
            this.snackBar.open(response.message || 'Error recording sample collection', 'Close', { duration: 3000 });
          }
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error recording sample collection:', error);
          this.snackBar.open('Error recording sample collection', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}