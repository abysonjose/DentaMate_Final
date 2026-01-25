import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InsuranceService } from '../../services/insurance.service';

@Component({
  selector: 'app-insurance-dashboard',
  templateUrl: './insurance-dashboard.component.html',
  styleUrls: ['./insurance-dashboard.component.scss']
})
export class InsuranceDashboardComponent implements OnInit {
  currentUser: any;
  sidebarItems = [
    {
      label: 'Claims Overview',
      icon: 'dashboard',
      route: '/insurance/overview',
      description: 'Today\'s claims summary and alerts'
    },
    {
      label: 'Patient Insurance',
      icon: 'people',
      route: '/insurance/patient-insurance',
      description: 'Manage patient insurance profiles'
    },
    {
      label: 'Claim Submission',
      icon: 'send',
      route: '/insurance/claim-submission',
      description: 'Create and submit new claims'
    },
    {
      label: 'Claim Tracking',
      icon: 'track_changes',
      route: '/insurance/claim-tracking',
      description: 'Track claim lifecycle and status'
    },
    {
      label: 'Documents',
      icon: 'folder',
      route: '/insurance/documents',
      description: 'Manage claim documents and evidence'
    },
    {
      label: 'Communication',
      icon: 'chat',
      route: '/insurance/communication',
      description: 'Insurer communication and follow-ups'
    },
    {
      label: 'Settlement',
      icon: 'account_balance',
      route: '/insurance/settlement',
      description: 'Settlement verification and reconciliation'
    },
    {
      label: 'Reports',
      icon: 'assessment',
      route: '/insurance/reports',
      description: 'Claims reports and analytics'
    }
  ];

  constructor(
    private router: Router,
    private insuranceService: InsuranceService
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    // Load current user profile
    this.currentUser = {
      name: 'Insurance Staff',
      role: 'Insurance Coordinator',
      branch: 'Main Branch',
      avatar: null
    };
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    // Implement logout logic
    this.router.navigate(['/auth/login']);
  }
}