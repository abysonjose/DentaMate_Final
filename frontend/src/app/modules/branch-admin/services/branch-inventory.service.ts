import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unit: string;
  unitPrice: number;
  supplier: string;
  expiryDate?: Date;
  lastRestocked: Date;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired';
}

@Injectable({
  providedIn: 'root'
})
export class BranchInventoryService {
  private readonly apiUrl = `${environment.apiUrl}/branch-admin/inventory`;

  constructor(private http: HttpClient) {}

  // Read-only inventory operations for branch admin
  getAllItems(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(this.apiUrl);
  }

  getItemById(id: string): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(`${this.apiUrl}/${id}`);
  }

  getLowStockItems(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/low-stock`);
  }

  getExpiringItems(days: number = 30): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/expiring?days=${days}`);
  }

  getItemsByCategory(category: string): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/category/${encodeURIComponent(category)}`);
  }

  getConsumptionReport(period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/consumption?period=${period}`);
  }

  getInventoryAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics`);
  }

  getUsageTrends(itemId: string, period: string = '30d'): Observable<any> {
    return this.http.get(`${this.apiUrl}/${itemId}/usage-trends?period=${period}`);
  }

  exportInventoryReport(format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export?format=${format}`, { responseType: 'blob' });
  }
}