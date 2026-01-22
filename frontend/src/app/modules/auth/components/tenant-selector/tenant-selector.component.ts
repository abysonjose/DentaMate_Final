import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
}

@Component({
  selector: 'app-tenant-selector',
  templateUrl: './tenant-selector.component.html',
  styleUrls: ['./tenant-selector.component.scss']
})
export class TenantSelectorComponent {
  @Input() tenants: Tenant[] = [];
  @Input() selectedTenantId: string | null = null;
  @Input() disabled: boolean = false;
  @Output() tenantSelected = new EventEmitter<string>();

  onTenantChange(tenantId: string): void {
    this.tenantSelected.emit(tenantId);
  }
}