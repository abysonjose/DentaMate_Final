import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-report-export-dialog',
  templateUrl: './report-export-dialog.component.html',
  styleUrls: ['./report-export-dialog.component.scss']
})
export class ReportExportDialogComponent {
  exportForm: FormGroup;

  formatOptions = [
    { value: 'PDF', label: 'PDF', description: 'Formatted document suitable for printing', icon: 'picture_as_pdf' },
    { value: 'CSV', label: 'CSV', description: 'Data file for spreadsheet applications', icon: 'table_chart' }
  ];

  constructor(
    public dialogRef: MatDialogRef<ReportExportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { reportType: string, params: any },
    private fb: FormBuilder
  ) {
    this.exportForm = this.fb.group({
      format: ['PDF', Validators.required]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onExport(): void {
    if (this.exportForm.valid) {
      this.dialogRef.close(this.exportForm.value);
    }
  }

  getReportTitle(): string {
    const reportTitles: { [key: string]: string } = {
      'daily-revenue': 'Daily Revenue Report',
      'monthly-income': 'Monthly Income Report',
      'payment-mode': 'Payment Mode Report',
      'aging-report': 'Aging Report',
      'ledger-summary': 'Ledger Summary'
    };
    return reportTitles[this.data.reportType] || 'Report';
  }
}