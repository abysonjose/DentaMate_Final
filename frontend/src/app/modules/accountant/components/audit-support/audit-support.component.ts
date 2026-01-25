import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AccountantService, AuditLog } from '../../services/accountant.service';
import { AuditNoteDialogComponent } from '../../dialogs/audit-note-dialog/audit-note-dialog.component';

@Component({
  selector: 'app-audit-support',
  templateUrl: './audit-support.component.html',
  styleUrls: ['./audit-support.component.scss']
})
export class AuditSupportComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'timestamp',
    'userId',
    'action',
    'entityType',
    'entityId',
    'details',
    'notes',
    'actions'
  ];

  dataSource = new MatTableDataSource<AuditLog>();
  loading = true;
  filterForm: FormGroup;

  entityTypeOptions = [
    { value: '', label: 'All Entity Types' },
    { value: 'PAYMENT', label: 'Payment' },
    { value: 'BILL', label: 'Bill' },
    { value: 'LEDGER', label: 'Ledger Entry' },
    { value: 'USER', label: 'User' },
    { value: 'SYSTEM', label: 'System' }
  ];

  constructor(
    private accountantService: AccountantService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      entityType: [''],
      userId: [''],
      action: ['']
    });
  }

  ngOnInit(): void {
    this.loadAuditLogs();
    this.setupFilterSubscription();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadAuditLogs(): void {
    this.loading = true;
    const filters = this.filterForm.value;
    
    this.accountantService.getAuditLogs(filters).subscribe({
      next: (logs) => {
        this.dataSource.data = logs;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading audit logs:', error);
        this.snackBar.open('Error loading audit logs', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  setupFilterSubscription(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.loadAuditLogs();
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadAuditLogs();
  }

  openNoteDialog(log: AuditLog): void {
    const dialogRef = this.dialog.open(AuditNoteDialogComponent, {
      width: '500px',
      data: { log }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addAuditNote(log.id, result.note);
      }
    });
  }

  addAuditNote(logId: string, note: string): void {
    this.accountantService.addAuditNote(logId, note).subscribe({
      next: () => {
        this.snackBar.open('Audit note added successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadAuditLogs();
      },
      error: (error) => {
        console.error('Error adding audit note:', error);
        this.snackBar.open('Error adding audit note', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  exportAuditLogs(): void {
    const filters = this.filterForm.value;
    this.accountantService.exportReport('audit-logs', 'CSV', filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting audit logs:', error);
        this.snackBar.open('Error exporting audit logs', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  getActionIcon(action: string): string {
    const actionIcons: { [key: string]: string } = {
      'CREATE': 'add_circle',
      'UPDATE': 'edit',
      'DELETE': 'delete',
      'VIEW': 'visibility',
      'EXPORT': 'download',
      'LOGIN': 'login',
      'LOGOUT': 'logout'
    };
    return actionIcons[action] || 'info';
  }

  getActionColor(action: string): string {
    const actionColors: { [key: string]: string } = {
      'CREATE': 'success',
      'UPDATE': 'primary',
      'DELETE': 'warn',
      'VIEW': 'accent',
      'EXPORT': 'primary',
      'LOGIN': 'success',
      'LOGOUT': 'warn'
    };
    return actionColors[action] || 'default';
  }
}