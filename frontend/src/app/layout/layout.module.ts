import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Angular Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

// Layout Components
import { MainLayoutComponent } from './main-layout.component';
import { NavbarComponent } from './navbar/navbar.component';
import { RoleSidebarComponent } from './role-sidebar/role-sidebar.component';
import { FooterComponent } from './footer/footer.component';

@NgModule({
  declarations: [
    MainLayoutComponent,
    NavbarComponent,
    RoleSidebarComponent,
    FooterComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    
    // Angular Material
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  exports: [
    MainLayoutComponent,
    NavbarComponent,
    RoleSidebarComponent,
    FooterComponent
  ]
})
export class LayoutModule { }