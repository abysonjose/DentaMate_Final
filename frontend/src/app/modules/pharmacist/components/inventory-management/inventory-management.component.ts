import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { PharmacistService, Medicine } from '../../services/pharmacist.service';
import { StockRefillRequestDialogComponent } from '../../dialogs/stock-refill-request-dialog/stock-refill-request-dialog.component';

@Component({
  selector: 'app-inventory-management',
  templateUrl: './inventory-management.component.html',
  styleUrls: ['./inventory-management.component.scss']
})
export class InventoryManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  displayedColumns: string[] = [
    'name',
    'category',
    'currentStock',
    'stockStatus',
    'expiryDate',
    'unitPrice',
    'location',
    'actions'
  ];

  dataSource = new MatTableDataSource<Medicine>();
  searchControl = new FormControl('');
  categoryFilter = new FormControl('all');
  statusFilter = new FormControl('all');
  
  isLoading = false;
  totalMedicines = 0;

  categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'antibiotics', label: 'Antibiotics' },
    { value: 'painkillers', label: 'Pain Killers' },
    { value: 'antiseptics', label: 'Antiseptics' },
    { value: 'vitamins', label: 'Vitamins' },
    { value: 'dental_care', label: 'Dental Care' }
  ];

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'available', label: 'Available' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'expired', label: 'Expired' }
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private pharmacistService: PharmacistService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setupDataSource();
    this.setupFilters();
    this.loadInventory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupDataSource(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    this.dataSource.filterPredicate = (data: Medicine, filter: string) => {
      const searchTerm = filter.toLowerCase();
      return data.name.toLowerCase().includes(searchTerm) ||
             data.genericName.toLowerCase().includes(searchTerm) ||
             data.manufacturer.toLowerCase().includes(searchTerm);
    };
  }

  setupFilters(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        this.dataSource.filter = value?.trim().toLowerCase() || '';
      });

    this.categoryFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    this.statusFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  loadInventory(): void {
    this.isLoading = true;

    this.pharmacistService.getMedicineInventory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (medicines) => {
          this.dataSource.data = medicines;
          this.totalMedicines = medicines.length;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading inventory:', error);
          this.snackBar.open('Error loading inventory', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    let filteredData = this.dataSource.data;

    if (this.categoryFilter.value !== 'all') {
      filteredData = filteredData.filter(medicine => 
        medicine.category === this.categoryFilter.value
      );
    }

    if (this.statusFilter.value !== 'all') {
      filteredData = filteredData.filter(medicine => 
        medicine.status === this.statusFilter.value
      );
    }

    this.dataSource.data = filteredData;
  }

  requestStockRefill(medicine: Medicine): void {
    const dialogRef = this.dialog.open(StockRefillRequestDialogComponent, {
      width: '600px',
      data: {
        medicineId: medicine.id,
        medicineName: medicine.name,
        currentStock: medicine.currentStock,
        minStockLevel: medicine.minStockLevel
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.snackBar.open('Stock refill request submitted successfully', 'Close', { duration: 3000 });
      }
    });
  }

  getStockStatusColor(status: string): string {
    switch (status) {
      case 'available': return 'accent';
      case 'low_stock': return 'warn';
      case 'out_of_stock': return 'warn';
      case 'expired': return 'warn';
      default: return '';
    }
  }

  getStockStatusIcon(status: string): string {
    switch (status) {
      case 'available': return 'check_circle';
      case 'low_stock': return 'warning';
      case 'out_of_stock': return 'remove_shopping_cart';
      case 'expired': return 'dangerous';
      default: return 'help';
    }
  }

  isExpiringSoon(expiryDate: Date): boolean {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  }

  isExpired(expiryDate: Date): boolean {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  }

  getExpiryStatusColor(expiryDate: Date): string {
    if (this.isExpired(expiryDate)) return 'warn';
    if (this.isExpiringSoon(expiryDate)) return 'accent';
    return '';
  }

  refreshInventory(): void {
    this.loadInventory();
  }

  exportInventory(): void {
    this.snackBar.open('Export functionality will be implemented', 'Close', { duration: 2000 });
  }
}