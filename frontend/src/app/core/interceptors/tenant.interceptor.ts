import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class TenantInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const user = this.authService.getCurrentUser();
    
    if (user?.tenantId) {
      const tenantReq = req.clone({
        setHeaders: {
          'X-Tenant-ID': user.tenantId
        }
      });
      return next.handle(tenantReq);
    }
    
    return next.handle(req);
  }
}