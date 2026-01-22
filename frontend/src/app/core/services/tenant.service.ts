import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  settings?: {
    branding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
    features?: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private readonly apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  private currentTenantSubject = new BehaviorSubject<Tenant | null>(null);
  
  public currentTenant$ = this.currentTenantSubject.asObservable();

  constructor(private http: HttpClient) {}

  getTenants(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(`${this.apiUrl}/tenants`);
  }

  getTenantById(id: string): Observable<Tenant> {
    return this.http.get<Tenant>(`${this.apiUrl}/tenants/${id}`);
  }

  setCurrentTenant(tenant: Tenant): void {
    this.currentTenantSubject.next(tenant);
    localStorage.setItem('current_tenant', JSON.stringify(tenant));
  }

  getCurrentTenant(): Tenant | null {
    return this.currentTenantSubject.value;
  }

  loadStoredTenant(): void {
    const tenantStr = localStorage.getItem('current_tenant');
    if (tenantStr) {
      const tenant = JSON.parse(tenantStr);
      this.currentTenantSubject.next(tenant);
    }
  }

  clearTenant(): void {
    this.currentTenantSubject.next(null);
    localStorage.removeItem('current_tenant');
  }
}