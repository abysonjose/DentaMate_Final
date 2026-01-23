import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NursingStaff } from '../../services/head-nurse.service';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  currentRoom?: string;
  status: 'available' | 'busy' | 'break';
}

interface Room {
  id: string;
  number: string;
  type: 'consultation' | 'procedure' | 'surgery';
  status: 'available' | 'occupied' | 'cleaning';
  equipment: string[];
}

@Component({
  selector: 'app-assign-nurse-dialog',
  templateUrl: './assign-nurse-dialog.component.html',
  styleUrls: ['./assign-nurse-dialog.component.scss']
})
export class AssignNurseDialogComponent implements OnInit {
  assignmentForm: FormGroup;
  
  availableDoctors: Doctor[] = [
    {
      id: '1',
      name: 'Dr. Sarah Johnson',
      specialization: 'General Dentistry',
      currentRoom: 'Room 101',
      status: 'available'
    },
    {
      id: '2',
      name: 'Dr. Michael Chen',
      specialization: 'Orthodontics',
      currentRoom: 'Room 102',
      status: 'busy'
    },
    {
      id: '3',
      name: 'Dr. Emily Rodriguez',
      specialization: 'Oral Surgery',
      status: 'available'
    }
  ];

  availableRooms: Room[] = [
    {
      id: '1',
      number: '101',
      type: 'consultation',
      status: 'available',
      equipment: ['Digital X-ray', 'Intraoral Camera']
    },
    {
      id: '2',
      number: '102',
      type: 'procedure',
      status: 'occupied',
      equipment: ['Ultrasonic Scaler', 'LED Curing Light']
    },
    {
      id: '3',
      number: '103',
      type: 'surgery',
      status: 'available',
      equipment: ['Surgical Suite', 'Anesthesia Machine']
    }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AssignNurseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { nurse: NursingStaff }
  ) {
    this.assignmentForm = this.fb.group({
      doctorId: ['', Validators.required],
      roomNumber: ['', Validators.required],
      assignmentType: ['general_assistance', Validators.required],
      duration: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Filter available doctors and rooms
    this.availableDoctors = this.availableDoctors.filter(doctor => doctor.status === 'available');
    this.availableRooms = this.availableRooms.filter(room => room.status === 'available');
  }

  onDoctorChange(): void {
    const selectedDoctor = this.availableDoctors.find(
      doctor => doctor.id === this.assignmentForm.get('doctorId')?.value
    );
    
    if (selectedDoctor?.currentRoom) {
      this.assignmentForm.patchValue({
        roomNumber: selectedDoctor.currentRoom
      });
    }
  }

  onSubmit(): void {
    if (this.assignmentForm.valid) {
      const formValue = this.assignmentForm.value;
      const selectedDoctor = this.availableDoctors.find(d => d.id === formValue.doctorId);
      const selectedRoom = this.availableRooms.find(r => r.number === formValue.roomNumber);
      
      const result = {
        doctorId: formValue.doctorId,
        doctorName: selectedDoctor?.name,
        roomNumber: formValue.roomNumber,
        roomType: selectedRoom?.type,
        assignmentType: formValue.assignmentType,
        duration: formValue.duration,
        notes: formValue.notes
      };
      
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getDoctorStatusColor(status: string): string {
    const colors = {
      'available': 'primary',
      'busy': 'warn',
      'break': 'accent'
    };
    return colors[status] || 'basic';
  }

  getRoomStatusColor(status: string): string {
    const colors = {
      'available': 'primary',
      'occupied': 'warn',
      'cleaning': 'accent'
    };
    return colors[status] || 'basic';
  }
}