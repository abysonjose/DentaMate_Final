import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { SupportStaffService, Room, CleaningItem } from '../../services/support-staff.service';
import { RoomCleaningDialogComponent } from '../../dialogs/room-cleaning-dialog/room-cleaning-dialog.component';
import { ComplianceChecklistDialogComponent } from '../../dialogs/compliance-checklist-dialog/compliance-checklist-dialog.component';

@Component({
  selector: 'app-room-readiness',
  templateUrl: './room-readiness.component.html',
  styleUrls: ['./room-readiness.component.scss']
})
export class RoomReadinessComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  rooms: Room[] = [];
  filteredRooms: Room[] = [];
  
  // Filter options
  selectedStatus: string = 'ALL';
  selectedType: string = 'ALL';
  searchTerm: string = '';

  statusOptions = [
    { value: 'ALL', label: 'All Status' },
    { value: 'OCCUPIED', label: 'Occupied' },
    { value: 'CLEANING_REQUIRED', label: 'Cleaning Required' },
    { value: 'READY', label: 'Ready' },
    { value: 'OUT_OF_ORDER', label: 'Out of Order' }
  ];

  typeOptions = [
    { value: 'ALL', label: 'All Types' },
    { value: 'CONSULTATION', label: 'Consultation' },
    { value: 'TREATMENT', label: 'Treatment' },
    { value: 'WAITING', label: 'Waiting Area' },
    { value: 'UTILITY', label: 'Utility' }
  ];

  // Statistics
  roomStats = {
    total: 0,
    occupied: 0,
    cleaningRequired: 0,
    ready: 0,
    outOfOrder: 0
  };

  // Standard cleaning checklist
  standardCleaningItems: CleaningItem[] = [
    { id: '1', item: 'Chair/Bed cleaned and sanitized', completed: false },
    { id: '2', item: 'Floor mopped and sanitized', completed: false },
    { id: '3', item: 'Surfaces wiped down', completed: false },
    { id: '4', item: 'Waste bins emptied', completed: false },
    { id: '5', item: 'Equipment sanitized', completed: false },
    { id: '6', item: 'Fresh linens/covers applied', completed: false },
    { id: '7', item: 'Air freshener applied', completed: false },
    { id: '8', item: 'Room inspection completed', completed: false }
  ];

  constructor(
    private supportStaffService: SupportStaffService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRooms();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRooms(): void {
    // Mock data for development
    this.loadMockRooms();
    this.applyFilters();
    this.calculateStats();
  }

  private loadMockRooms(): void {
    this.rooms = [
      {
        id: '1',
        number: '101',
        type: 'CONSULTATION',
        status: 'CLEANING_REQUIRED',
        lastCleaned: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        id: '2',
        number: '102',
        type: 'TREATMENT',
        status: 'READY',
        lastCleaned: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        id: '3',
        number: '103',
        type: 'CONSULTATION',
        status: 'OCCUPIED'
      },
      {
        id: '4',
        number: '201',
        type: 'TREATMENT',
        status: 'CLEANING_REQUIRED',
        lastCleaned: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      },
      {
        id: '5',
        number: 'W1',
        type: 'WAITING',
        status: 'READY',
        lastCleaned: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      },
      {
        id: '6',
        number: 'U1',
        type: 'UTILITY',
        status: 'OUT_OF_ORDER'
      }
    ];
  }

  applyFilters(): void {
    this.filteredRooms = this.rooms.filter(room => {
      const statusMatch = this.selectedStatus === 'ALL' || room.status === this.selectedStatus;
      const typeMatch = this.selectedType === 'ALL' || room.type === this.selectedType;
      const searchMatch = this.searchTerm === '' || 
        room.number.toLowerCase().includes(this.searchTerm.toLowerCase());

      return statusMatch && typeMatch && searchMatch;
    });
  }

  private calculateStats(): void {
    this.roomStats.total = this.rooms.length;
    this.roomStats.occupied = this.rooms.filter(r => r.status === 'OCCUPIED').length;
    this.roomStats.cleaningRequired = this.rooms.filter(r => r.status === 'CLEANING_REQUIRED').length;
    this.roomStats.ready = this.rooms.filter(r => r.status === 'READY').length;
    this.roomStats.outOfOrder = this.rooms.filter(r => r.status === 'OUT_OF_ORDER').length;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedStatus = 'ALL';
    this.selectedType = 'ALL';
    this.searchTerm = '';
    this.applyFilters();
  }

  startCleaning(room: Room): void {
    const dialogRef = this.dialog.open(RoomCleaningDialogComponent, {
      width: '600px',
      data: { 
        room, 
        cleaningItems: [...this.standardCleaningItems] 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.completeRoomCleaning(room.id, result.checklist);
      }
    });
  }

  completeRoomCleaning(roomId: string, checklist: CleaningItem[]): void {
    this.supportStaffService.completeRoomCleaning(roomId, checklist)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Room cleaning completed successfully', 'Close', { duration: 3000 });
          this.loadRooms();
        },
        error: (error) => {
          this.snackBar.open('Failed to complete room cleaning', 'Close', { duration: 3000 });
        }
      });
  }

  markRoomReady(room: Room): void {
    this.supportStaffService.updateRoomStatus(room.id, 'READY')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Room marked as ready', 'Close', { duration: 3000 });
          this.loadRooms();
        },
        error: (error) => {
          this.snackBar.open('Failed to update room status', 'Close', { duration: 3000 });
        }
      });
  }

  openComplianceChecklist(): void {
    const dialogRef = this.dialog.open(ComplianceChecklistDialogComponent, {
      width: '500px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Compliance checklist completed', 'Close', { duration: 3000 });
      }
    });
  }

  getRoomStatusColor(status: string): string {
    switch (status) {
      case 'OCCUPIED': return 'warn';
      case 'CLEANING_REQUIRED': return 'accent';
      case 'READY': return 'primary';
      case 'OUT_OF_ORDER': return 'warn';
      default: return '';
    }
  }

  getRoomStatusIcon(status: string): string {
    switch (status) {
      case 'OCCUPIED': return 'person';
      case 'CLEANING_REQUIRED': return 'cleaning_services';
      case 'READY': return 'check_circle';
      case 'OUT_OF_ORDER': return 'error';
      default: return 'help';
    }
  }

  getRoomTypeIcon(type: string): string {
    switch (type) {
      case 'CONSULTATION': return 'medical_services';
      case 'TREATMENT': return 'local_hospital';
      case 'WAITING': return 'event_seat';
      case 'UTILITY': return 'build';
      default: return 'meeting_room';
    }
  }

  canStartCleaning(room: Room): boolean {
    return room.status === 'CLEANING_REQUIRED';
  }

  canMarkReady(room: Room): boolean {
    return room.status === 'CLEANING_REQUIRED';
  }

  getTimeSinceLastCleaned(room: Room): string {
    if (!room.lastCleaned) return 'Never';
    
    const now = new Date();
    const lastCleaned = new Date(room.lastCleaned);
    const diff = now.getTime() - lastCleaned.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  }

  isCleaningOverdue(room: Room): boolean {
    if (!room.lastCleaned || room.status !== 'CLEANING_REQUIRED') return false;
    
    const now = new Date();
    const lastCleaned = new Date(room.lastCleaned);
    const hoursSinceLastCleaned = (now.getTime() - lastCleaned.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceLastCleaned > 3; // Overdue if more than 3 hours
  }

  sortRooms(rooms: Room[]): Room[] {
    return rooms.sort((a, b) => {
      // Sort by status priority (CLEANING_REQUIRED > OUT_OF_ORDER > OCCUPIED > READY)
      const statusOrder = { 
        'CLEANING_REQUIRED': 4, 
        'OUT_OF_ORDER': 3, 
        'OCCUPIED': 2, 
        'READY': 1 
      };
      const statusDiff = statusOrder[b.status] - statusOrder[a.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Then by room number
      return a.number.localeCompare(b.number);
    });
  }
}