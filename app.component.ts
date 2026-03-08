import { Component, inject, computed } from '@angular/core';
import { CommonModule }       from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService }        from './core/services/auth.service';
import { CarrinhoService }    from './core/services/carrinho.service';

import { MatToolbarModule }   from '@angular/material/toolbar';
import { MatButtonModule }    from '@angular/material/button';
import { MatIconModule }      from '@angular/material/icon';
import { MatMenuModule }      from '@angular/material/menu';
import { MatBadgeModule }     from '@angular/material/badge';
import { MatSidenavModule }   from '@angular/material/sidenav';
import { MatListModule }      from '@angular/material/list';
import { MatDividerModule }   from '@angular/material/divider';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterModule,
    MatToolbarModule, MatButtonModule, MatIconModule,
    MatMenuModule, MatBadgeModule, MatSidenavModule,
    MatListModule, MatDividerModule,
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">

      <!-- ── Sidebar Admin ──────────────────────────────────────────── -->
      <mat-sidenav #sidenav mode="over" position="start" class="admin-sidenav"
                   *ngIf="authService.isAdmin()">
        <div class="sidenav-header">
          <mat-icon class="logo-icon">restaurant</mat-icon>
          <span class="logo-text">Comanda Digital</span>
        </div>
        <mat-divider />
        <mat-nav-list>
          <mat-list-item routerLink="/admin/dashboard" (click)="sidenav.close()">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </mat-list-item>
          <mat-list-item routerLink="/admin/pedidos" (click)="sidenav.close()">
            <mat-icon matListItemIcon>receipt_long</mat-icon>
            <span matListItemTitle>Pedidos</span>
          </mat-list-item>
          <mat-list-item routerLink="/admin/pratos" (click)="sidenav.close()">
            <mat-icon matListItemIcon>menu_book</mat-icon>
            <span matListItemTitle>Cardápio</span>
          </mat-list-item>
          <mat-list-item routerLink="/admin/estoque" (click)="sidenav.close()">
            <mat-icon matListItemIcon>inventory_2</mat-icon>
            <span matListItemTitle>Estoque</span>
          </mat-list-item>
          <mat-list-item routerLink="/admin/fichas-tecnicas" (click)="sidenav.close()">
            <mat-icon matListItemIcon>calculate</mat-icon>
            <span matListItemTitle>Fichas Técnicas</span>
          </mat-list-item>
          <mat-divider />
          <mat-list-item routerLink="/cardapio" (click)="sidenav.close()">
            <mat-icon matListItemIcon>storefront</mat-icon>
            <span matListItemTitle>Ver Cardápio Público</span>
          </mat-list-item>
        </mat-nav-list>
      </mat-sidenav>

      <!-- ── Conteúdo Principal ─────────────────────────────────────── -->
      <mat-sidenav-content>

        <!-- Toolbar -->
        <mat-toolbar color="primary" class="app-toolbar">

          <!-- Menu hambúrguer (admin) -->
          @if (authService.isAdmin()) {
            <button mat-icon-button (click)="sidenav.toggle()">
              <mat-icon>menu</mat-icon>
            </button>
          }

          <!-- Logo -->
          <a routerLink="/" class="toolbar-brand">
            <mat-icon>restaurant</mat-icon>
            <span class="brand-name">Comanda Digital</span>
          </a>

          <span class="spacer"></span>

          <!-- Links de navegação (desktop) -->
          <nav class="nav-links">
            <button mat-button routerLink="/cardapio" routerLinkActive="active-link">
              <mat-icon>menu_book</mat-icon> Cardápio
            </button>

            @if (authService.isAuthenticated()) {
              <button mat-button routerLink="/meus-pedidos" routerLinkActive="active-link">
                <mat-icon>receipt</mat-icon> Meus Pedidos
              </button>
            }

            @if (authService.isAdmin()) {
              <button mat-button routerLink="/admin" routerLinkActive="active-link">
                <mat-icon>admin_panel_settings</mat-icon> Admin
              </button>
            }
          </nav>

          <!-- Carrinho -->
          <button mat-icon-button routerLink="/carrinho"
                  [matBadge]="carrinhoService.totalItens()"
                  [matBadgeHidden]="carrinhoService.totalItens() === 0"
                  matBadgeColor="accent"
                  matBadgeSize="small">
            <mat-icon>shopping_cart</mat-icon>
          </button>

          <!-- Menu do usuário -->
          @if (authService.isAuthenticated()) {
            <button mat-icon-button [matMenuTriggerFor]="userMenu">
              <mat-icon>account_circle</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu">
              <div class="user-menu-header" mat-menu-item disabled>
                <strong>{{ authService.currentUser()?.nome }}</strong>
                <br>
                <small>{{ authService.currentUser()?.email }}</small>
              </div>
              <mat-divider />
              <button mat-menu-item routerLink="/meus-pedidos">
                <mat-icon>receipt</mat-icon> Meus Pedidos
              </button>
              <button mat-menu-item (click)="authService.logout()">
                <mat-icon>logout</mat-icon> Sair
              </button>
            </mat-menu>
          } @else {
            <button mat-button routerLink="/login">
              <mat-icon>login</mat-icon> Entrar
            </button>
          }
        </mat-toolbar>

        <!-- Router outlet -->
        <main class="main-content">
          <router-outlet />
        </main>

      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
    }

    .admin-sidenav {
      width: 260px;
    }

    .sidenav-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px;
      background: #e65c00;
      color: white;

      .logo-icon { font-size: 32px; height: 32px; width: 32px; }
      .logo-text  { font-size: 1.2rem; font-weight: 700; }
    }

    /* Toolbar */
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .toolbar-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: white;
      font-weight: 700;
      font-size: 1.1rem;
    }

    .brand-name {
      @media (max-width: 480px) { display: none; }
    }

    .spacer { flex: 1; }

    .nav-links {
      display: flex;
      gap: 4px;
      @media (max-width: 768px) { display: none; }

      button { color: rgba(255,255,255,0.85); }
      button:hover { color: white; }
      .active-link { color: white !important; background: rgba(255,255,255,0.15); border-radius: 4px; }
    }

    .user-menu-header {
      padding: 12px 16px;
      line-height: 1.5;
    }

    .main-content {
      min-height: calc(100vh - 64px);
    }
  `]
})
export class AppComponent {
  authService    = inject(AuthService);
  carrinhoService = inject(CarrinhoService);
}
