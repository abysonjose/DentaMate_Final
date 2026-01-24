import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CashSummary } from '../../services/cash-handling.service';

@Component({
  selector: 'app-shift-closure-dialog',
  template: `
    <div class="shift-closure-dialog">
      <h2 mat-dialog-title>
        <mat-icon>{{ isStartShift ? 'play_arrow' : 'stop' }}</mat-icon>
        {{ isStartShift ? 'Start Shift' : 'End Shift' }}
      </h2>

      <mat-dialog-content>
        <!-- Start Shift Form -->
        <form [formGroup]="shiftForm" *ngIf="isStartShift" class="start-shift-form">
          <mat-form-field appearance="outline">
            <mat-label>Opening Cash Balance</mat-label>
            <input matInput type="number" formControlName="openingBalance" 
                   min="0" step="0.01" placeholder="0.00">
            <span matPrefix>₹</span>
            <mat-error *ngIf="shiftForm.get('openingBalance')?.hasError('required')">
              Opening balance is required
            </mat-error>
            <mat-error *ngIf="shiftForm.get('openingBalance')?.hasError('min')">
              Opening balance cannot be negative
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Notes (Optional)</mat-label>
            <textarea matInput formControlName="notes" rows="3" 
                      placeholder="Any notes about starting the shift..."></textarea>
          </mat-form-field>
        </form>

        <!-- End Shift Form -->
        <div *ngIf="!isStartShift" class="end-shift-form">
          <!-- Cash Summary Display -->
          <mat-card class="summary-card" *ngIf="cashSummary">
            <mat-card-header>
              <mat-card-title>Shift Summary</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="label">Current Balance:</span>
                  <span class="value">₹{{ cashSummary.currentBalance | number:'1.2-2' }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Cash Received:</span>
                  <span class="value success">₹{{ cashSummary.todayReceived | number:'1.2-2' }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Cash Paid:</span>
                  <span class="value">₹{{ cashSummary.todayPaid | number:'1.2-2' }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Total Transactions:</span>
                  <span class="value">{{ cashSummary.transactionCount }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Closure Form -->
          <form [formGroup]="shiftForm" class="closure-form">
            <div class="form-section">
              <h4>Cash Count</h4>
              <mat-form-field appearance="outline">
                <mat-label>Actual Cash Count</mat-label>
                <input matInput type="number" formControlName="actualClosing" 
                       min="0" step="0.01" (input)="calculateVariance()">
                <span matPrefix>₹</span>
                <mat-error *ngIf="shiftForm.get('actualClosing')?.hasError('required')">
                  Actual cash count is required
                </mat-error>
              </mat-form-field>

              <div class="calculation-display" *ngIf="expectedClosing > 0">
                <div class="calc-row">
                  <span>Expected Closing:</span>
                  <span class="amount">₹{{ expectedClosing | number:'1.2-2' }}</span>
                </div>
                <div class="calc-row">
                  <span>Actual Closing:</span>
                  <span class="amount">₹{{ shiftForm.get('actualClosing')?.value | number:'1.2-2' }}</span>
                </div>
                <div class="calc-row variance" [class.positive]="variance > 0" [class.negative]="variance < 0">
                  <span>Variance:</span>
                  <span class="amount">₹{{ variance | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h4>Digital Payments Summary</h4>
              <mat-form-field appearance="outline">
                <mat-label>Total Digital Payments</mat-label>
                <input matInput type="number" formControlName="totalDigital" 
                       min="0" step="0.01" readonly>
                <span matPrefix>₹</span>
              </mat-form-field>
            </div>

            <div class="form-section">
              <h4>Transaction Summary</h4>
              <mat-form-field appearance="outline">
                <mat-label>Total Transactions</mat-label>
                <input matInput type="number" formControlName="totalTransactions" readonly>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Closure Notes</mat-label>
              <textarea matInput formControlName="notes" rows="3" 
                        placeholder="Any discrepancies, issues, or notes about the shift..."></textarea>
            </mat-form-field>

            <!-- Variance Alert -->
            <mat-card class="variance-alert" *ngIf="Math.abs(variance) > 0.01">
              <mat-card-content>
                <div class="alert-content">
                  <mat-icon [color]="Math.abs(variance) > 100 ? 'warn' : 'accent'">
                    {{ Math.abs(variance) > 100 ? 'error' : 'warning' }}
                  </mat-icon>
                  <div class="alert-text">
                    <strong>Cash Variance Detected</strong>
                    <p>
                      There is a {{ variance > 0 ? 'surplus' : 'shortage' }} of 
                      ₹{{ Math.abs(variance) | number:'1.2-2' }} in your cash count.
                      {{ Math.abs(variance) > 100 ? 'This requires supervisor approval.' : 'Please verify your count.' }}
                    </p>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </form>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button 
                [color]="isStartShift ? 'primary' : (Math.abs(variance) > 100 ? 'warn' : 'primary')"
                (click)="onSubmit()" 
                [disabled]="shiftForm.invalid">
          <mat-icon>{{ isStartShift ? 'play_arrow' : 'stop' }}</mat-icon>
          {{ isStartShift ? 'Start Shift' : 'End Shift' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styleUrls: ['./shift-closure-dialog.component.scss']
})
export class ShiftClosureDialogComponent implements OnInit {
  shiftForm: FormGroup;
  isStartShift: boolean;
  cashSummary: CashSummary | null = null;
  expectedClosing = 0;
  variance = 0;
  Math = Math; // Make Math available in template

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ShiftClosureDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isStartShift = data?.action === 'START';
    this.cashSummary = data?.cashSummary;
    this.expectedClosing = this.cashSummary?.currentBalance || 0;

    if (this.isStartShift) {
      this.shiftForm = this.fb.group({
        openingBalance: [0, [Validators.required, Validators.min(0)]],
        notes: ['']
      });
    } else {
      this.shiftForm = this.fb.group({
        actualClosing: [this.expectedClosing, [Validators.required, Validators.min(0)]],
        totalDigital: [{ value: 0, disabled: true }],
        totalTransactions: [{ value: this.cashSummary?.transactionCount || 0, disabled: true }],
        notes: ['']
      });
    }
  }

  ngOnInit(): void {
    if (!this.isStartShift) {
      this.calculateVariance();
    }
  }

  calculateVariance(): void {
    const actualClosing = this.shiftForm.get('actualClosing')?.value || 0;
    this.variance = actualClosing - this.expectedClosing;
  }

  onSubmit(): void {
    if (this.shiftForm.invalid) return;

    const formValue = this.shiftForm.value;

    if (this.isStartShift) {
      this.dialogRef.close({
        openingBalance: formValue.openingBalance,
        notes: formValue.notes
      });
    } else {
      this.dialogRef.close({
        totalCash: this.cashSummary?.todayReceived || 0,
        totalDigital: formValue.totalDigital,
        totalTransactions: this.cashSummary?.transactionCount || 0,
        openingBalance: 0, // This would come from the current shift data
        expectedClosing: this.expectedClosing,
        actualClosing: formValue.actualClosing,
        variance: this.variance,
        notes: formValue.notes
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}