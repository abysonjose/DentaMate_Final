import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../../core/auth/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  active?: boolean;
}

@Component({
  selector: 'app-role-sidebar',
  templateUrl: './role-sidebar.component.html',
  styleUrls: ['./role-sidebar.component.scss']
})
export class RoleSidebarComponent implements OnInit {
  @Input() user: User | null = null;
  
  menuItems: MenuItem[] = [];
  isCollapsed = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.generateMenuItems();
  }

  ngOnChanges(): void {
    this.generateMenuItems();
  }

  private generateMenuItems(): void {
    if (!this.user?.role) {
      this.menuItems = [];
      return;
    }

    const role = this.user.role.toLowerCase();
    
    switch (role) {
      case 'patient':
        this.menuItems = [
          { label: 'Dashboard', icon: 'dashboard', route: '/patient/dashboard' },
          { label: 'Appointments', icon: 'event', route: '/patient/appointments' },
          { label: 'Medical Records', icon: 'folder_shared', route: '/patient/medical-records' },
          { label: 'Prescriptions', icon: 'medication', route: '/patient/prescriptions' },
          { label: 'Billing & Payments', icon: 'payment', route: '/patient/billing' },
          { label: 'Token Queue', icon: 'queue', route: '/patient/queue' },
          { label: 'Support', icon: 'help', route: '/patient/support' }
        ];
        break;

      case 'doctor':
        this.menuItems = [
          { label: 'Dashboard', icon: 'dashboard', route: '/doctor/dashboard' },
          { label: 'Patient Queue', icon: 'queue', route: '/doctor/queue' },
          { label: 'AI Diagnosis', icon: 'psychology', route: '/doctor/ai-diagnosis' },
          { label: 'Prescriptions', icon: 'medication', route: '/doctor/prescriptions' },
          { label: 'Patient Records', icon: 'folder_shared', route: '/doctor/patients' },
          { label: 'Appointments', icon: 'event', route: '/doctor/appointments' },
          { label: 'Clinical Notes', icon: 'note_add', route: '/doctor/notes' }
        ];
        break;

      case 'nurse':
        this.menuItems = [
          { label: 'Dashboard', icon: 'dashboard', route: '/nurse/dashboard' },
          { label: 'Patient Care', icon: 'healing', route: '/nurse/patient-care' },
          { label: 'Vitals', icon: 'monitor_heart', route: '/nurse/vitals' },
          { label: 'Medications', icon: 'medication', route: '/nurse/medications' },
          { label: 'Patient Queue', icon: 'queue', route: '/nurse/queue' },
          { label: 'Care Plans', icon: 'assignment', route: '/nurse/care-plans' }
        ];
        break;

      case 'receptionist':
        this.menuItems = [
          { label: 'Dashboard', icon: 'dashboard', route: '/receptionist/dashboard' },
          { label: 'Appointments', icon: 'event', route: '/receptionist/appointments' },
          { label: 'Patient Registration', icon: 'person_add', route: '/receptionist/registration' },
          { label: 'Token Management', icon: 'confirmation_number', route: '/receptionist/tokens' },
          { label: 'Queue Management', icon: 'queue', route: '/receptionist/queue' },
          { label: 'Check-in/Check-out', icon: 'how_to_reg', route: '/receptionist/checkin' }
        ];
        break;

      case 'cashier':
        this.menuItems = [
          { label: 'Dashboard', icon: 'dashboard', route: '/cashier/dashboard' },
          { label: 'Generate Bill', icon: 'receipt', route: '/cashier/billing' },
          { label: 'Payments', icon: 'payment', route: '/cashier/payments' },
          { label: 'Payment History', icon: 'history', route: '/cashier/history' },
          { label: 'Insurance Claims', icon: 'security', route: '/cashier/insurance' },
          { label: 'Reports', icon: 'assessment', route: '/cashier/reports' }
        ];
        break;

      case 'pharmacist':
        this.menuItems = [
          { label: 'Dashboard', icon: 'dashboard', route: '/pharmacist/dashboard' },
          { label: 'Prescriptions', icon: 'medication', route: '/pharmacist/prescriptions' },
          { label: 'Inventory', icon: 'inventory', route: '/pharmacist/inventory' },
          { label: 'Drug Interactions', icon: 'warning', route: '/pharmacist/interactions' },
          { label: 'Dispensing', icon: 'local_pharmacy', route: '/pharmacist/dispensing' },
          { label: 'Stock Management', icon: 'store', route: '/pharmacist/stock' }
        ];
        break;

      case 'lab-staff':
      case 'lab-technician':
        this.menuItems = [
          { label: 'Dashboard', icon: 'dashboard', route: '/lab-staff/dashboard' },
          { label: 'Test Orders', icon: 'assignment', route: '/lab-staff/orders' },
          { label: 'Sample Collection', icon: 'biotech', route: '/lab-staff/collection' },
          { label: 'Test Results', icon: 'science', route: '/lab-staff/results' },
          { label: 'Lab Reports', icon: 'description', route: '/lab-staff/reports' },
          { label: 'Equipment', icon: 'precision_manufacturing', route: '/lab-staff/equipment' }
        ];
        break;

      case 'branch-admin':
        this.menuItems = [
          { label: 'Dashboard', icon: 'dashboard', route: '/branch-admin/dashboard' },
          { label: 'Branch Overview', icon: 'business', route: '/branch-admin/overview' },
          { label: 'Staff Management', icon: 'group', route: '/branch-admin/staff' },
          { label: 'Patient Records', icon: 'folder_shared', route: '/branch-admin/patients' },
          { label: 'Queue Monitoring', icon: 'monitor', route: '/branch-admin/queue' },
          { label: 'Reports', icon: 'assessment', route: '/branch-admin/reports' },
          { label: 'Settings', icon: 'settings', route: '/branch-admin/settings' }
        ];
        break;

      case 'central-admin':
        this.menuItems = [
          { label: 'Dashboard', icon: 'dashboard', route: '/central-admin/dashboard' },
          { label: 'Clinic Management', icon: 'business', route: '/central-admin/clinics' },
          { label: 'Global Appointments', icon: 'event', route: '/central-admin/appointments' },
          { label: 'Analytics Overview', icon: 'analytics', route: '/central-admin/analytics' },
          { label: 'System Configuration', icon: 'settings', route: '/central-admin/config' },
          { label: 'Queue Monitoring', icon: 'monitor', route: '/central-admin/queue' },
          { label: 'Capacity Management', icon: 'tune', route: '/central-admin/capacity' }
        ];
        break;

      default:
        this.menuItems = [
          { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' }
        ];
    }

    // Set active state based on current route
    this.updateActiveState();
  }

  private updateActiveState(): void {
    const currentUrl = this.router.url;
    this.menuItems.forEach(item => {
      item.active = currentUrl.startsWith(item.route);
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.updateActiveState();
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  getRoleDisplayName(): string {
    if (!this.user?.role) return '';
    
    return this.user.role
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}