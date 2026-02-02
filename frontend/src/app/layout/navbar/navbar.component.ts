import { Component, Input } from '@angular/core';
import { AuthService, User } from '../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  @Input() user: User | null = null;

  constructor(private authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }

  getUserDisplayName(): string {
    if (!this.user) return 'User';
    return `${this.user.firstName} ${this.user.lastName}`.trim() || this.user.email;
  }

  getRoleDisplayName(): string {
    if (!this.user?.role) return '';
    
    // Convert role to display format
    return this.user.role
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}