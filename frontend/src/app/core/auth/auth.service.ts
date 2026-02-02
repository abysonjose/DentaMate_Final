import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roles?: string[]; // Support for multiple roles
  tenantId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantId: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  expiresIn?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.getToken();
    const user = this.getStoredUser();
    
    if (token && user) {
      const enhancedUser = this.enhanceUserFromToken(user);
      this.currentUserSubject.next(enhancedUser);
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoadingSubject.next(true);
    
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success) {
            const enhancedUser = this.enhanceUserFromToken(response.user);
            this.setSession(response);
            this.currentUserSubject.next(enhancedUser);
          }
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => error);
        }),
        map(response => {
          this.isLoadingSubject.next(false);
          return response;
        })
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }

    return this.http.post(`${this.API_URL}/refresh`, { refreshToken })
      .pipe(
        tap((response: any) => {
          localStorage.setItem('access_token', response.accessToken);
          if (response.refreshToken) {
            localStorage.setItem('refresh_token', response.refreshToken);
          }
        }),
        catchError(error => {
          this.logout();
          return throwError(() => error);
        })
      );
  }

  private setSession(authResult: AuthResponse): void {
    localStorage.setItem('access_token', authResult.tokens.accessToken);
    localStorage.setItem('refresh_token', authResult.tokens.refreshToken);
    localStorage.setItem('current_user', JSON.stringify(authResult.user));
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem('current_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Check both single role and roles array
    const userRoles = user.roles || [user.role];
    return roles.some(role => userRoles.includes(role));
  }

  getUserRoles(): string[] {
    const user = this.getCurrentUser();
    if (!user) return [];
    
    return user.roles || [user.role];
  }

  private parseJwtPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  }

  private enhanceUserFromToken(user: User): User {
    const token = this.getToken();
    if (token) {
      const payload = this.parseJwtPayload(token);
      if (payload && payload.roles) {
        user.roles = Array.isArray(payload.roles) ? payload.roles : [payload.roles];
      }
    }
    return user;
  }

  setAuthData(user: User, tokens: { accessToken: string; refreshToken: string }): void {
    localStorage.setItem('access_token', tokens.accessToken);
    localStorage.setItem('refresh_token', tokens.refreshToken);
    localStorage.setItem('current_user', JSON.stringify(user));
    const enhancedUser = this.enhanceUserFromToken(user);
    this.currentUserSubject.next(enhancedUser);
  }
}