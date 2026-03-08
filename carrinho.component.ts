import { Component, inject } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { CarrinhoService } from '../../../core/services/carrinho.service';
import { AuthService }     from '../../../core/services/auth.service';

import { MatCardModule }      from '@angular/material/card';
import { MatButtonModule }    from '@angular/material/button';
import { MatIconModule }      from '@angular/material/icon';
import { MatDividerModule }   from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-carrinho',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatDividerModule, MatSnackBarModule,
  ],
  template: `
    <div class="carrinho-page">
      <div class="carrinho-container">

        <div class="page-header">
          <button mat-icon-button routerLink="/cardapio">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h2>Meu Carrinho</h2>
          @if (carrinhoService.totalItens() > 0) {
            <button mat-button color="warn" (click)="limpar()">
              <mat-icon>delete_sweep</mat-icon> Limpar
            </button>
          }
        </div>

        <!-- Carrinho vazio -->
        @if (carrinhoService.totalItens() === 0) {
          <div class="carrinho-vazio">
            <mat-icon class="icon-empty">shopping_cart</mat-icon>
            <h3>Seu carrinho está vazio</h3>
            <p>Adicione itens do cardápio para continuar</p>
            <button mat-raised-button color="primary" routerLink="/cardapio">
              <mat-icon>menu_book</mat-icon> Ver Cardápio
            </button>
          </div>
        }

        <!-- Itens -->
        @if (carrinhoService.totalItens() > 0) {
          <div class="carrinho-content">
            <div class="itens-lista">
              @for (item of carrinhoService.itensCarrinho(); track item.prato.id) {
                <mat-card class="item-card">
                  <div class="item-layout">
                    <img [src]="item.prato.imagemUrl || 'assets/images/prato-default.jpg'"
                         [alt]="item.prato.nome" class="item-img"
                         (error)="onImgError($event)" />

                    <div class="item-info">
                      <h4>{{ item.prato.nome }}</h4>
                      <p class="item-categoria">{{ item.prato.categoriaNome }}</p>
                      <p class="item-preco-unit">
                        {{ item.prato.precoVenda | currency:'BRL':'symbol':'1.2-2' }} / un
                      </p>
                    </div>

                    <div class="item-controles">
                      <div class="qty-controle">
                        <button mat-icon-button color="warn"
                                (click)="diminuir(item.prato.id)">
                          <mat-icon>{{ item.quantidade === 1 ? 'delete' : 'remove' }}</mat-icon>
                        </button>
                        <span class="qty">{{ item.quantidade }}</span>
                        <button mat-icon-button color="primary"
                                (click)="aumentar(item.prato.id, item.prato)">
                          <mat-icon>add</mat-icon>
                        </button>
                      </div>
                      <p class="item-subtotal">
                        {{ item.prato.precoVenda * item.quantidade | currency:'BRL':'symbol':'1.2-2' }}
                      </p>
                    </div>
                  </div>
                </mat-card>
              }
            </div>

            <!-- Resumo -->
            <mat-card class="resumo-card">
              <h3>Resumo do Pedido</h3>
              <mat-divider />

              <div class="resumo-linha">
                <span>Subtotal ({{ carrinhoService.totalItens() }} itens)</span>
                <span>{{ carrinhoService.subtotal() | currency:'BRL':'symbol':'1.2-2' }}</span>
              </div>
              <div class="resumo-linha taxa">
                <span>Taxa de entrega</span>
                <span class="taxa-info">Calculada no checkout</span>
              </div>

              <mat-divider />

              <div class="resumo-linha total">
                <strong>Total estimado</strong>
                <strong>{{ carrinhoService.subtotal() | currency:'BRL':'symbol':'1.2-2' }}</strong>
              </div>

              <button mat-raised-button color="primary" class="btn-checkout"
                      (click)="irParaCheckout()">
                <mat-icon>payment</mat-icon>
                Finalizar Pedido
              </button>

              <button mat-button routerLink="/cardapio" class="btn-continuar">
                <mat-icon>arrow_back</mat-icon> Continuar Comprando
              </button>
            </mat-card>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .carrinho-page {
      background: #f5f5f5;
      min-height: 100vh;
      padding: 16px;
    }

    .carrinho-container { max-width: 1000px; margin: 0 auto; }

    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;

      h2 { margin: 0; flex: 1; font-size: 1.4rem; }
    }

    /* ── Vazio ──────────────────────────────────────── */
    .carrinho-vazio {
      text-align: center;
      padding: 80px 24px;
      background: white;
      border-radius: 16px;

      .icon-empty { font-size: 80px; height: 80px; width: 80px; color: #ccc; }
      h3 { margin: 16px 0 8px; color: #555; }
      p  { color: #888; margin: 0 0 24px; }
    }

    /* ── Layout ─────────────────────────────────────── */
    .carrinho-content {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 20px;
      align-items: start;

      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }

    .itens-lista {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* ── Item card ──────────────────────────────────── */
    .item-card { border-radius: 12px !important; }

    .item-layout {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
    }

    .item-img {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 10px;
      flex-shrink: 0;
    }

    .item-info {
      flex: 1;
      h4  { margin: 0 0 4px; font-size: 1rem; }
      p   { margin: 0; }
    }

    .item-categoria   { font-size: 0.75rem; color: #e65c00; font-weight: 600; }
    .item-preco-unit  { font-size: 0.85rem; color: #888; margin-top: 4px !important; }

    .item-controles {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .qty-controle {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid #eee;
      border-radius: 24px;
      padding: 2px;
    }

    .qty { font-size: 1.1rem; font-weight: 700; min-width: 24px; text-align: center; }

    .item-subtotal { font-weight: 700; color: #e65c00; margin: 0; font-size: 1rem; }

    /* ── Resumo ─────────────────────────────────────── */
    .resumo-card {
      border-radius: 16px !important;
      padding: 20px !important;
      position: sticky;
      top: 80px;

      h3 { margin: 0 0 16px; }
    }

    .resumo-linha {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 0.95rem;
      color: #555;

      &.total {
        font-size: 1.1rem;
        color: #333;
        padding-top: 12px;
      }
    }

    .taxa-info { color: #888; font-size: 0.8rem; }

    .btn-checkout {
      width: 100%;
      height: 48px;
      font-size: 1rem;
      margin: 16px 0 8px;
    }

    .btn-continuar {
      width: 100%;
      color: #666;
    }
  `]
})
export class CarrinhoComponent {
  carrinhoService = inject(CarrinhoService);
  private auth    = inject(AuthService);
  private router  = inject(Router);
  private snack   = inject(MatSnackBar);

  aumentar(pratoId: number, prato: any): void {
    this.carrinhoService.adicionarItem(prato, 1);
  }

  diminuir(pratoId: number): void {
    const item = this.carrinhoService.itensCarrinho().find(i => i.prato.id === pratoId);
    if (!item) return;
    this.carrinhoService.alterarQuantidade(pratoId, item.quantidade - 1);
  }

  limpar(): void {
    this.carrinhoService.limpar();
  }

  irParaCheckout(): void {
    if (!this.auth.isAuthenticated()) {
      this.snack.open('Faça login para finalizar o pedido', 'Entrar', { duration: 4000 })
        .onAction().subscribe(() => this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } }));
      return;
    }
    this.router.navigate(['/checkout']);
  }

  onImgError(e: Event): void {
    (e.target as HTMLImageElement).src = 'assets/images/prato-default.jpg';
  }
}
