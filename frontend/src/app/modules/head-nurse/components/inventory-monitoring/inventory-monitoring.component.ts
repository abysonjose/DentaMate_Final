import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { HeadNurseService, InventoryItem } from '../../services/head-nurse.service';
import { InventoryRequestDialogComponent } from '../../dialogs/inventory-request-dialog/inventory-request-dialog.component';

@Component({
  selector: 'app-inventory-monitoring',
  templateUrl: './inventory-monitoring.component.html',
  styleUrls: ['./inventory-monitoring.component.scss']
})
export class InventoryMonitoringComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  inventoryItems: InventoryItem[] = [];
  filteredItems: InventoryItem[] = [];
  
  displayedColumns: string[] = ['name', 'category', 'currentStock', 'status', 'expiryDate', 'location', 'actions'];
  
  filterOptions = {
    category: 'all',
    status: 'all',
    searchTerm: ''
  };

  categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'clinical_consumables', label: 'Clinical Consumables' },
    { value: 'dental_supplies', label: 'Dental Supplies' },
    { value: 'hygiene_sterilization', label: 'Hygiene & Sterilization' },
    { value: 'room_equipment', label: 'Room & Equipment' }
  ];

  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'ok', label: 'OK' },
    { value: 'low', label: 'Low Stock' },
    { value: 'critical', label: 'Critical' }
  ];

  inventoryMetrics = {
    totalItems: 0,
    okItems: 0,
    lowStockItems: 0,
    criticalItems: 0,
    expiringItems: 0
  };

  constructor(
    private headNurseService: HeadNurseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadInventoryItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInventoryItems(): void {
    this.headNurseService.getInventoryItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.inventoryItems = items;
        this.updateMetrics();
        this.applyFilters();
      });
  }

  private updateMetrics(): void {
    this.inventoryMetrics.totalItems = this.inventoryItems.length;
    this.inventoryMetrics.okItems = this.inventoryItems.filter(item => item.status === 'ok').length;
    this.inventoryMetrics.lowStockItems = this.inventoryItems.filter(item => item.status === 'low').length;
    this.inventoryMetrics.criticalItems = this.inventoryItems.filter(item => item.status === 'critical').length;
    
    // Calculate expiring items (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    this.inventoryMetrics.expiringItems = this.inventoryItems.filter(item => 
      item.expiryDate && new Date(item.expiryDate) <= thirtyDaysFromNow
    ).length;
  }

  applyFilters(): void {
    this.filteredItems = this.inventoryItems.filter(item => {
      const matchesCategory = this.filterOptions.category === 'all' || item.category === this.filterOptions.category;
      const matchesStatus = this.filterOptions.status === 'all' || item.status === this.filterOptions.status;
      const matchesSearch = !this.filterOptions.searchTerm || 
        item.name.toLowerCase().includes(this.filterOptions.searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(this.filterOptions.searchTerm.toLowerCase());
      
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }

  createRestockRequest(item: InventoryItem): void {
    const dialogRef = this.dialog.open(InventoryRequestDialogComponent, {
      width: '500px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.headNurseService.createInventoryRequest(
          item.id, 
          result.quantity, 
          result.urgency, 
          result.notes
        ).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Restock request submitted successfully', 'Close', { duration: 3000 });
          },
          error: (error) => {
            this.snackBar.open('Failed to submit restock request', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  getStatusColor(status: string): string {
    const colors = {
      'ok': 'primary',
      'low': 'accent',
      'critical': 'warn'
    };
    return colors[status] || 'basic';
  }

  getStatusIcon(status: string): string {
    const icons = {
      'ok': 'check_circle',
      'low': 'warning',
      'critical': 'error'
    };
    return icons[status] || 'help';
  }

  getCategoryIcon(category: string): string {
    const icons = {
      'clinical_consumables': 'medical_services',
      'dental_supplies': 'build',
      'hygiene_sterilization': 'cleaning_services',
      'room_equipment': 'chair'
    };
    return icons[category] || 'inventory';
  }

  isExpiringSoon(item: InventoryItem): boolean {
    if (!item.expiryDate) return false;
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return new Date(item.expiryDate) <= thirtyDaysFromNow;
  }

  getExpiryStatus(item: InventoryItem): string {
    if (!item.expiryDate) return '';
    
    const today = new Date();
    const expiryDate = new Date(item.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry <= 7) return 'Expires in ' + daysUntilExpiry + ' days';
    if (daysUntilExpiry <= 30) return 'Expires in ' + daysUntilExpiry + ' days';
    
    return '';
  }

  getStockPercentage(item: InventoryItem): number {
    return (item.currentStock / (item.minimumStock * 3)) * 100; // Assuming max stock is 3x minimum
  }

  refreshData(): void {
    this.loadInventoryItems();
  }
}