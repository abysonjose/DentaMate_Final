import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { LedgerEntry } from '../../services/accountant.service';

@Component({
  selector: 'app-ledger-tag-dialog',
  templateUrl: './ledger-tag-dialog.component.html',
  styleUrls: ['./ledger-tag-dialog.component.scss']
})
export class LedgerTagDialogComponent {
  tagForm: FormGroup;

  predefinedTags = [
    'CAPEX', 'OPEX', 'REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY',
    'EQUIPMENT', 'SUPPLIES', 'SALARY', 'RENT', 'UTILITIES',
    'MARKETING', 'INSURANCE', 'MAINTENANCE', 'TRAINING', 'TRAVEL'
  ];

  constructor(
    public dialogRef: MatDialogRef<LedgerTagDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { entry: LedgerEntry },
    private fb: FormBuilder
  ) {
    this.tagForm = this.fb.group({
      tags: this.fb.array(this.initializeTags())
    });
  }

  get tagsArray(): FormArray {
    return this.tagForm.get('tags') as FormArray;
  }

  private initializeTags(): any[] {
    const tags = this.data.entry.tags || [];
    if (tags.length === 0) {
      return [this.fb.control('')];
    }
    return tags.map(tag => this.fb.control(tag));
  }

  addTag(): void {
    this.tagsArray.push(this.fb.control(''));
  }

  removeTag(index: number): void {
    if (this.tagsArray.length > 1) {
      this.tagsArray.removeAt(index);
    }
  }

  addPredefinedTag(tag: string): void {
    const currentTags = this.tagsArray.value.filter((t: string) => t.trim() !== '');
    if (!currentTags.includes(tag)) {
      // Find first empty control or add new one
      const emptyIndex = this.tagsArray.value.findIndex((t: string) => t.trim() === '');
      if (emptyIndex >= 0) {
        this.tagsArray.at(emptyIndex).setValue(tag);
      } else {
        this.tagsArray.push(this.fb.control(tag));
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    const tags = this.tagsArray.value
      .filter((tag: string) => tag && tag.trim() !== '')
      .map((tag: string) => tag.trim().toUpperCase());
    
    this.dialogRef.close({ tags });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  getTypeColor(type: string): string {
    return type === 'DEBIT' ? 'warn' : 'primary';
  }

  getTypeIcon(type: string): string {
    return type === 'DEBIT' ? 'remove' : 'add';
  }
}