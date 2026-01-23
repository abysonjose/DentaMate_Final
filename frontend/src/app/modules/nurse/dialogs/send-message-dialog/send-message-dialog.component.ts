import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NurseService, Patient } from '../../services/nurse.service';

@Component({
  selector: 'app-send-message-dialog',
  templateUrl: './send-message-dialog.component.html',
  styleUrls: ['./send-message-dialog.component.scss']
})
export class SendMessageDialogComponent implements OnInit {
  messageForm: FormGroup;
  patients: Patient[] = [];
  
  recipientTypes = [
    { value: 'doctor', label: 'Doctor' },
    { value: 'head-nurse', label: 'Head Nurse' }
  ];

  messageTypes = [
    { value: 'info', label: 'Information' },
    { value: 'request', label: 'Request' },
    { value: 'urgent', label: 'Urgent' }
  ];

  // Mock recipients - in real app, these would come from API
  doctors = [
    { id: 'doc1', name: 'Dr. Smith' },
    { id: 'doc2', name: 'Dr. Johnson' },
    { id: 'doc3', name: 'Dr. Williams' }
  ];

  headNurses = [
    { id: 'hn1', name: 'Sarah Connor' },
    { id: 'hn2', name: 'Mary Johnson' }
  ];

  constructor(
    private fb: FormBuilder,
    private nurseService: NurseService,
    private dialogRef: MatDialogRef<SendMessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.messageForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadPatients();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      recipientType: ['doctor', Validators.required],
      recipientId: ['', Validators.required],
      subject: ['', [Validators.required, Validators.maxLength(100)]],
      message: ['', [Validators.required, Validators.maxLength(1000)]],
      messageType: ['info', Validators.required],
      patientId: ['']
    });
  }

  private loadPatients(): void {
    this.nurseService.getAssignedPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
      },
      error: (error) => {
        console.error('Error loading patients:', error);
      }
    });
  }

  getRecipients(): any[] {
    const recipientType = this.messageForm.get('recipientType')?.value;
    return recipientType === 'doctor' ? this.doctors : this.headNurses;
  }

  onSend(): void {
    if (this.messageForm.valid) {
      const formValue = this.messageForm.value;
      const selectedPatient = this.patients.find(p => p.id === formValue.patientId);
      
      const messageData = {
        recipientId: formValue.recipientId,
        recipientRole: formValue.recipientType,
        subject: formValue.subject,
        message: formValue.message,
        messageType: formValue.messageType,
        patientId: formValue.patientId || undefined,
        patientName: selectedPatient?.name || undefined
      };

      this.dialogRef.close(messageData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getSelectedRecipientName(): string {
    const recipientId = this.messageForm.get('recipientId')?.value;
    const recipients = this.getRecipients();
    const recipient = recipients.find(r => r.id === recipientId);
    return recipient ? recipient.name : '';
  }

  getSelectedPatientName(): string {
    const patientId = this.messageForm.get('patientId')?.value;
    const patient = this.patients.find(p => p.id === patientId);
    return patient ? patient.name : '';
  }
}