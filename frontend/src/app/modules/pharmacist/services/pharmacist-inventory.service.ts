import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface InventoryItem {
  id: string;
  medicationId: string;
  medicationName: string;
  genericName?: string;
  category: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minimumStock: number;
  maximumStock: number;
  reorderLevel: number;
  unitPrice: number;
  totalValue: number;
  lastUpdated: Date;
  lowStockWarning: boolean;
  outOfStock: boolean;
  batches: InventoryBatch[];
}

export interface InventoryBatch {
  id: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  expiryDate: Date;
  manufacturingDate: Date;
  supplier: string;
  receivedDate: Date;
  isExpired: boolean;
  isNearExpiry: boolean;
  daysToExpiry: number;
}

export interface StockDeductionRecord {
  id: string;
  medicationId: string;
  medicationName: string;
  prescriptionId: string;
  patientName: string;
  quantityDeducted: number;
  batchNumber: string;
  unitPrice: number;
  totalValue: number;
  deductedAt: Date;
  deductedBy: string;
  reason: 'dispensed' | 'damaged' | 'expired' | 'returned' | 'adjustment';
  notes?: string;
}

export interface LowStockAlert {
  id: string;
  medicationId: string;
  medicationName: string;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  severity: 'low' | 'critical' | 'out_of_stock';
  alertDate: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacistInventoryService {
  private apiUrl = `${environment.apiUrl}/pharmacist/inventory`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    const tenantId = localStorage.getItem('tenantId');
    const userId = localStorage.getItem('userId');
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId || '',
      'X-User-ID': userId || '',
      'Content-Type': 'application/json'
    });
  }

  // Inventory Management
  getInventoryItems(filters?: {
    category?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
    nearExpiry?: boolean;
    search?: string;
  }): Observable<InventoryItem[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    return this.http.get<any>(`${this.apiUrl}/items?${params.toString()}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const items = response.data || response;
        return items.map((item: any) => this.mapToInventoryItem(item));
      })
    );
  }

  private mapToInventoryItem(data: any): InventoryItem {
    return {
      id: data.id,
      medicationId: data.medicationId,
      medicationName: data.medicationName || data.name,
      genericName: data.genericName,
      category: data.category,
      currentStock: data.currentStock || 0,
      reservedStock: data.reservedStock || 0,
      availableStock: data.availableStock || (data.currentStock - data.reservedStock) || 0,
      minimumStock: data.minimumStock || 0,
      maximumStock: data.maximumStock || 0,
      reorderLevel: data.reorderLevel || 0,
      unitPrice: data.unitPrice || 0,
      totalValue: data.totalValue || (data.currentStock * data.unitPrice) || 0,
      lastUpdated: new Date(data.lastUpdated || data.updatedAt),
      lowStockWarning: data.lowStockWarning || (data.currentStock <= data.reorderLevel),
      outOfStock: data.outOfStock || (data.currentStock <= 0),
      batches: (data.batches || []).map((b: any) => this.mapToInventoryBatch(b))
    };
  }

  private mapToInventoryBatch(data: any): InventoryBatch {
    const expiryDate = new Date(data.expiryDate);
    const today = new Date();
    const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      id: data.id,
      batchNumber: data.batchNumber,
      quantity: data.quantity || 0,
      unitPrice: data.unitPrice || 0,
      expiryDate: expiryDate,
      manufacturingDate: new Date(data.manufacturingDate),
      supplier: data.supplier,
      receivedDate: new Date(data.receivedDate),
      isExpired: daysToExpiry < 0,
      isNearExpiry: daysToExpiry <= 30 && daysToExpiry >= 0,
      daysToExpiry: daysToExpiry
    };
  }

  // Stock Deduction
  getStockDeductionRecords(filters?: {
    medicationId?: string;
    dateFrom?: string;
    dateTo?: string;
    reason?: string;
  }): Observable<StockDeductionRecord[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    return this.http.get<any>(`${this.apiUrl}/deductions?${params.toString()}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const records = response.data || response;
        return records.map((record: any) => this.mapToStockDeductionRecord(record));
      })
    );
  }

  private mapToStockDeductionRecord(data: any): StockDeductionRecord {
    return {
      id: data.id,
      medicationId: data.medicationId,
      medicationName: data.medicationName,
      prescriptionId: data.prescriptionId,
      patientName: data.patientName,
      quantityDeducted: data.quantityDeducted,
      batchNumber: data.batchNumber,
      unitPrice: data.unitPrice || 0,
      totalValue: data.totalValue || (data.quantityDeducted * data.unitPrice) || 0,
      deductedAt: new Date(data.deductedAt || data.createdAt),
      deductedBy: data.deductedBy,
      reason: data.reason || 'dispensed',
      notes: data.notes
    };
  }

  // Low Stock Alerts
  getLowStockAlerts(): Observable<LowStockAlert[]> {
    return this.http.get<any>(`${this.apiUrl}/low-stock-alerts`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const alerts = response.data || response;
        return alerts.map((alert: any) => this.mapToLowStockAlert(alert));
      })
    );
  }

  private mapToLowStockAlert(data: any): LowStockAlert {
    return {
      id: data.id,
      medicationId: data.medicationId,
      medicationName: data.medicationName,
      currentStock: data.currentStock || 0,
      minimumStock: data.minimumStock || 0,
      reorderLevel: data.reorderLevel || 0,
      severity: data.severity || (data.currentStock <= 0 ? 'out_of_stock' : 
                data.currentStock <= data.minimumStock ? 'critical' : 'low'),
      alertDate: new Date(data.alertDate || data.createdAt),
      acknowledged: data.acknowledged || false,
      acknowledgedBy: data.acknowledgedBy,
      acknowledgedAt: data.acknowledgedAt ? new Date(data.acknowledgedAt) : undefined
    };
  }

  acknowledgeLowStockAlert(alertId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/low-stock-alerts/${alertId}/acknowledge`, {}, {
      headers: this.getHeaders()
    });
  }

  // Stock Verification
  verifyStockBeforeDispense(medications: {
    medicationId: string;
    quantityNeeded: number;
  }[]): Observable<{
    medicationId: string;
    medicationName: string;
    quantityNeeded: number;
    quantityAvailable: number;
    canDispense: boolean;
    suggestedBatches: {
      batchNumber: string;
      quantity: number;
      expiryDate: Date;
    }[];
    warnings: string[];
  }[]> {
    return this.http.post<any>(`${this.apiUrl}/verify-stock`, { medications }, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }

  // Batch Management
  getMedicationBatches(medicationId: string): Observable<InventoryBatch[]> {
    return this.http.get<any>(`${this.apiUrl}/medications/${medicationId}/batches`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const batches = response.data || response;
        return batches.map((batch: any) => this.mapToInventoryBatch(batch));
      })
    );
  }

  // Expiry Management
  getNearExpiryItems(daysThreshold: number = 30): Observable<{
    medicationId: string;
    medicationName: string;
    batches: {
      batchNumber: string;
      quantity: number;
      expiryDate: Date;
      daysToExpiry: number;
    }[];
    totalQuantity: number;
  }[]> {
    return this.http.get<any>(`${this.apiUrl}/near-expiry?days=${daysThreshold}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }

  // Inventory Statistics
  getInventoryStatistics(): Observable<{
    totalMedications: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    nearExpiryItems: number;
    expiredItems: number;
    categoryBreakdown: { category: string; count: number; value: number }[];
    topMedications: { name: string; quantity: number; value: number }[];
  }> {
    return this.http.get(`${this.apiUrl}/statistics`, {
      headers: this.getHeaders()
    });
  }

  // Search Inventory
  searchInventory(query: string): Observable<InventoryItem[]> {
    return this.http.get<any>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        const items = response.data || response;
        return items.map((item: any) => this.mapToInventoryItem(item));
      })
    );
  }

  // Stock Movement History
  getStockMovementHistory(medicationId: string, limit?: number): Observable<{
    id: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reason: string;
    batchNumber?: string;
    performedBy: string;
    performedAt: Date;
    notes?: string;
    balanceAfter: number;
  }[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this.http.get<any>(`${this.apiUrl}/medications/${medicationId}/movements${params}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data || response)
    );
  }
}