import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PharmacistDashboardData {
  pendingPrescriptions: number;
  dispensedToday: number;
  lowStockItems: number;
  totalMedicinesInStock: number;
  recentActivity: PharmacistActivity[];
}

export interface PharmacistActivity {
  id: string;
  type: 'prescription_dispensed' | 'stock_updated' | 'low_stock_alert';
  description: string;
  timestamp: Date;
  patientName?: string;
  medicationName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacistService {
  private apiUrl = `${environment.apiUrl}/pharmacist`;

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

  // Dashboard Data
  getDashboardData(): Observable<PharmacistDashboardData> {
    return this.http.get<PharmacistDashboardData>(`${this.apiUrl}/dashboard`, {
      headers: this.getHeaders()
    });
  }

  // Recent Activity
  getRecentActivity(limit: number = 10): Observable<PharmacistActivity[]> {
    return this.http.get<PharmacistActivity[]>(`${this.apiUrl}/activity?limit=${limit}`, {
      headers: this.getHeaders()
    });
  }

  // Pharmacist Profile
  getPharmacistProfile(): Observable<{
    id: string;
    name: string;
    licenseNumber: string;
    branchId: string;
    branchName: string;
    specializations: string[];
    workingHours: {
      start: string;
      end: string;
    };
  }> {
    return this.http.get(`${this.apiUrl}/profile`, {
      headers: this.getHeaders()
    });
  }

  // Statistics
  getPharmacistStats(dateFrom?: string, dateTo?: string): Observable<{
    totalPrescriptionsDispensed: number;
    averageDispenseTime: number;
    mostDispensedMedications: { name: string; count: number }[];
    patientsServed: number;
    stockDeductions: number;
  }> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return this.http.get(`${this.apiUrl}/stats?${params.toString()}`, {
      headers: this.getHeaders()
    });
  }
}