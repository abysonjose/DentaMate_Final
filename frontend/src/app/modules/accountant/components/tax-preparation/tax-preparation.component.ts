import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountantService } from '../../services/accountant.service';

@Component({
  selector: 'app-tax-preparation',
  templateUrl: './tax-preparation.component.html',
  styleUrls: ['./tax-preparation.component.scss']
})
export class TaxPreparationComponent implements OnInit {
  taxForm: FormGroup;
  loading = false;
  taxData: any = null;

  availableYears = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2,
    new Date().getFullYear() - 3
  ];

  constructor(
    private accountantService: AccountantService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.taxForm = this.fb.group({
      year: [new Date().getFullYear(), Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadTaxData();
  }

  loadTaxData(): void {
    const year = this.taxForm.get('year')?.value;
    if (year) {
      this.loading = true;
      this.accountantService.getTaxData(year).subscribe({
        next: (data) => {
          this.taxData = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading tax data:', error);
          this.snackBar.open('Error loading tax data', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.loading = false;
        }
      });
    }
  }

  onYearChange(): void {
    this.loadTaxData();
  }

  exportTaxData(format: 'PDF' | 'CSV'): void {
    const year = this.taxForm.get('year')?.value;
    this.accountantService.exportTaxData(year, format).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tax-data-${year}.${format.toLowerCase()}`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.snackBar.open('Tax data exported successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('Error exporting tax data:', error);
        this.snackBar.open('Error exporting tax data', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }
}