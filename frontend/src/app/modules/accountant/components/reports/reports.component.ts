import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountantService } from '../../services/accountant.service';
import { ReportExportDialogComponent } from '../../dialogs/report-export-dialog/report-export-dialog.component';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  reportForm: FormGroup;
  loading = false;

  reportTypes = [
    { value: 'daily-revenue', label: 'Daily Revenue Report', description: 'Revenue breakdown for a specific date' },
    { value: 'monthly-income', label: 'Monthly Income Report', description: 'Comprehensive monthly income summary' },
    { value: 'payment-mode', label: 'Payment Mode Report', description: 'Payment method breakdown and analysis' },
    { value: 'aging-report', label: 'Aging Report', description: 'Outstanding receivables by aging categories' },
    { value: 'ledger-summary', label: 'Ledger Summary', description: 'General ledger entries summary' }
  ];

  constructor(
    private accountantService: AccountantService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.reportForm = this.fb.group({
      reportType: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

  generateReport(): void {
    if (this.reportForm.valid) {
      const { reportType, startDate, endDate } = this.reportForm.value;
      
      this.loading = true;
      
      // Simulate report generation
      setTimeout(() => {
        this.loading = false;
        this.openExportDialog(reportType, { startDate, endDate });
      }, 2000);
    }
  }

  openExportDialog(reportType: string, params: any): void {
    const dialogRef = this.dialog.open(ReportExportDialogComponent, {
      width: '500px',
      data: { reportType, params }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.exportReport(reportType, result.format, params);
      }
    });
  }

  exportReport(reportType: string, format: 'PDF' | 'CSV', params: any): void {
    this.accountantService.exportReport(reportType, format, params).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportType}-${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.snackBar.open('Report exported successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('Error exporting report:', error);
        this.snackBar.open('Error exporting report', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  quickReport(type: string): void {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const params = {
      startDate: type === 'daily-revenue' ? today : startOfMonth,
      endDate: today
    };

    this.openExportDialog(type, params);
  }
}