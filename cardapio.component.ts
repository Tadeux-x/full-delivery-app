// ============================================================
// cardapio.component.ts
// Componente Angular — Cardápio Público
// ============================================================
import {
  Component, OnInit, OnDestroy, signal, computed, inject
} from '@angular/core';
import { CommonModule }         from '@angular/common';
import { FormsModule }          from '@angular/forms';
import { RouterModule }         from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { CardapioService }  from '../../../core/services/cardapio.service';
import { CarrinhoService }  from '../../../core/services/carrinho.service';
import { Prato, PageResponse } from '../../../core/models/prato.model';

// Angular Material
import { MatCardModule }          from '@angular/material/card';
import { MatButtonModule }        from '@angular/material/button';
import { MatIconModule }          from '@angular/material/icon';
import { MatChipsModule }         from '@angular/material/chips';
import { MatInputModule }         from '@angular/material/input';
import { MatFormFieldModule }     from '@angular/material/form-field';
import { MatBadgeModule }         from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-cardapio',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatInputModule, MatFormFieldModule, MatBadgeModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatPaginatorModule,
  ],
  template: `
    <div class="cardapio-container">

      <!-- ── Hero / Cabeçalho ───────────────────────────────────────── -->
      <section class="hero">
        <div class="hero-content">
          <h1 class="hero-title">🍔 Comanda Digital</h1>
          <p class="hero-subtitle">Sabores artesanais direto para você</p>

          <!-- Busca -->
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Buscar prato...</mat-label>
            <input matInput [(ngModel)]="termoBusca"
                   (ngModelChange)="onBusca($event)"
                   placeholder="Ex: hambúrguer, pizza..."/>
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </div>

        <!-- Carrinho flutuante -->
        <button mat-fab color="accent" class="carrinho-fab"
                routerLink="/carrinho"
                [matBadge]="carrinhoService.totalItens()"
                [matBadgeHidden]="carrinhoService.totalItens() === 0"
                matBadgeColor="warn">
          <mat-icon>shopping_cart</mat-icon>
        </button>
      </section>

      <!-- ── Filtros por Categoria ───────────────────────────────────── -->
      <section class="categorias-section">
        <mat-chip-listbox class="categorias-chips"
                          [value]="categoriaSelecionada()"
                          (change)="filtrarCategoria($event.value)">
          <mat-chip-option [value]="null" selected>Todos</mat-chip-option>
          @for (cat of categorias(); track cat.id) {
            <mat-chip-option [value]="cat.id">{{ cat.nome }}</mat-chip-option>
          }
        </mat-chip-listbox>
      </section>

      <!-- ── Estado de loading ──────────────────────────────────────── -->
      @if (carregando()) {
        <div class="loading-center">
          <mat-spinner diameter="60" />
          <p>Carregando cardápio...</p>
        </div>
      }

      <!-- ── Grid de Pratos ─────────────────────────────────────────── -->
      @if (!carregando()) {
        <section class="pratos-grid">
          @if (pratos().length === 0) {
            <div class="sem-resultados">
              <mat-icon>search_off</mat-icon>
              <p>Nenhum prato encontrado. Tente outra busca!</p>
            </div>
          }

          @for (prato of pratos(); track prato.id) {
            <mat-card class="prato-card" [class.indisponivel]="!prato.disponivel">

              <!-- Imagem -->
              <div class="prato-imagem-wrapper">
                <img mat-card-image
                     [src]="prato.imagemUrl || 'assets/images/prato-default.jpg'"
                     [alt]="prato.nome"
                     (error)="onImageError($event)"
                     class="prato-imagem" />
                @if (!prato.disponivel) {
                  <div class="indisponivel-overlay">
                    <span>Indisponível</span>
                  </div>
                }
                <div class="categoria-badge">{{ prato.categoriaNome }}</div>
              </div>

              <mat-card-header>
                <mat-card-title>{{ prato.nome }}</mat-card-title>
                <mat-card-subtitle class="preco">
                  {{ prato.precoVenda | currency:'BRL':'symbol':'1.2-2' }}
                </mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <p class="descricao">{{ prato.descricao }}</p>
              </mat-card-content>

              <mat-card-actions align="end">
                <!-- Controle de Quantidade inline -->
                @if (getQtdNoCarrinho(prato.id) > 0) {
                  <div class="qty-control">
                    <button mat-icon-button color="warn"
                            (click)="diminuirQtd(prato)">
                      <mat-icon>remove_circle</mat-icon>
                    </button>
                    <span class="qty-display">{{ getQtdNoCarrinho(prato.id) }}</span>
                    <button mat-icon-button color="primary"
                            (click)="adicionarAoCarrinho(prato)">
                      <mat-icon>add_circle</mat-icon>
                    </button>
                  </div>
                } @else {
                  <button mat-raised-button color="primary"
                          [disabled]="!prato.disponivel"
                          (click)="adicionarAoCarrinho(prato)">
                    <mat-icon>add_shopping_cart</mat-icon>
                    Adicionar
                  </button>
                }
              </mat-card-actions>
            </mat-card>
          }
        </section>

        <!-- ── Paginação ──────────────────────────────────────────────── -->
        @if (totalPratos() > pageSize) {
          <mat-paginator
            [length]="totalPratos()"
            [pageSize]="pageSize"
            [pageSizeOptions]="[12, 24, 48]"
            [pageIndex]="paginaAtual()"
            (page)="onPageChange($event)"
            showFirstLastButtons />
        }
      }

      <!-- ── Barra Resumo Carrinho ──────────────────────────────────── -->
      @if (carrinhoService.totalItens() > 0) {
        <div class="carrinho-resumo" routerLink="/carrinho">
          <div class="resumo-info">
            <mat-icon>shopping_cart</mat-icon>
            <span>{{ carrinhoService.totalItens() }} item(s)</span>
          </div>
          <div class="resumo-total">
            <span>{{ carrinhoService.subtotal() | currency:'BRL':'symbol':'1.2-2' }}</span>
            <mat-icon>chevron_right</mat-icon>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .cardapio-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px 100px;
    }

    /* ── Hero ────────────────────────────────────── */
    .hero {
      background: linear-gradient(135deg, #e65c00, #f9d423);
      border-radius: 0 0 24px 24px;
      padding: 32px 24px;
      margin: 0 -16px 24px;
      position: relative;
      text-align: center;
    }

    .hero-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: white;
      margin: 0 0 8px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .hero-subtitle {
      color: rgba(255,255,255,0.9);
      font-size: 1.1rem;
      margin: 0 0 24px;
    }

    .search-field {
      width: 100%;
      max-width: 500px;
      background: white;
      border-radius: 8px;
    }

    .search-field ::ng-deep .mat-mdc-form-field-flex {
      background: white;
      border-radius: 8px;
    }

    .carrinho-fab {
      position: absolute !important;
      top: 16px;
      right: 16px;
    }

    /* ── Categorias ──────────────────────────────── */
    .categorias-section {
      margin-bottom: 24px;
      overflow-x: auto;
    }

    .categorias-chips {
      display: flex;
      gap: 8px;
      flex-wrap: nowrap;
      padding: 8px 0;
    }

    /* ── Loading ─────────────────────────────────── */
    .loading-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px 0;
      color: #666;
      gap: 16px;
    }

    /* ── Grid de Pratos ──────────────────────────── */
    .pratos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .prato-card {
      border-radius: 16px !important;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;

      &:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important; }
      &.indisponivel { opacity: 0.6; }
    }

    .prato-imagem-wrapper {
      position: relative;
      height: 200px;
      overflow: hidden;
    }

    .prato-imagem {
      width: 100%;
      height: 200px;
      object-fit: cover;
      margin: 0 !important;
      transition: transform 0.3s;
    }

    .prato-card:hover .prato-imagem {
      transform: scale(1.05);
    }

    .indisponivel-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1.2rem;
    }

    .categoria-badge {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(230,92,0,0.9);
      color: white;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    mat-card-title { font-size: 1.1rem; font-weight: 700; }

    .preco {
      font-size: 1.2rem !important;
      font-weight: 700 !important;
      color: #e65c00 !important;
    }

    .descricao {
      font-size: 0.875rem;
      color: #555;
      line-height: 1.5;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    /* ── Controle Quantidade ─────────────────────── */
    .qty-control {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .qty-display {
      font-size: 1.1rem;
      font-weight: 700;
      min-width: 28px;
      text-align: center;
    }

    /* ── Sem Resultados ──────────────────────────── */
    .sem-resultados {
      grid-column: 1/-1;
      text-align: center;
      padding: 64px;
      color: #999;

      mat-icon { font-size: 64px; height: 64px; width: 64px; }
      p { font-size: 1.1rem; margin-top: 16px; }
    }

    /* ── Barra Resumo Carrinho ───────────────────── */
    .carrinho-resumo {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #e65c00;
      color: white;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 -4px 16px rgba(0,0,0,0.2);

      &:hover { background: #cc5200; }
    }

    .resumo-info, .resumo-total {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 1rem;
    }

    /* ── Responsivo ──────────────────────────────── */
    @media (max-width: 600px) {
      .hero-title { font-size: 1.8rem; }
      .pratos-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class CardapioComponent implements OnInit, OnDestroy {
  private cardapioService = inject(CardapioService);
  carrinhoService         = inject(CarrinhoService);
  private snackBar        = inject(MatSnackBar);
  private destroy$        = new Subject<void>();

  // ── State ──────────────────────────────────────────────────────────────
  pratos            = signal<Prato[]>([]);
  categorias        = signal<Array<{id: number; nome: string}>>([]);
  carregando        = signal(false);
  totalPratos       = signal(0);
  paginaAtual       = signal(0);
  categoriaSelecionada = signal<number | null>(null);
  termoBusca        = '';
  pageSize          = 12;

  private buscaSubject = new Subject<string>();

  // ── Lifecycle ──────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.carregarPratos();
    this.configurarBusca();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Métodos de Dados ───────────────────────────────────────────────────

  carregarPratos(): void {
    this.carregando.set(true);
    this.cardapioService
      .listar(this.categoriaSelecionada() ?? undefined, this.paginaAtual(), this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page: PageResponse<Prato>) => {
          this.pratos.set(page.content);
          this.totalPratos.set(page.totalElements);

          // Extrai categorias únicas dos pratos carregados
          const cats = [...new Map(
            page.content.map(p => [p.categoriaId, { id: p.categoriaId, nome: p.categoriaNome }])
          ).values()];
          this.categorias.set(cats);

          this.carregando.set(false);
        },
        error: () => {
          this.carregando.set(false);
          this.snackBar.open('Erro ao carregar cardápio. Tente novamente.', 'Fechar', {
            duration: 5000, panelClass: ['snack-error']
          });
        }
      });
  }

  configurarBusca(): void {
    this.buscaSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(termo => {
      if (termo.length >= 2) {
        this.cardapioService.buscar(termo)
          .pipe(takeUntil(this.destroy$))
          .subscribe(pratos => {
            this.pratos.set(pratos);
            this.totalPratos.set(pratos.length);
          });
      } else if (termo.length === 0) {
        this.carregarPratos();
      }
    });
  }

  // ── Event Handlers ─────────────────────────────────────────────────────

  onBusca(termo: string): void {
    this.buscaSubject.next(termo);
  }

  filtrarCategoria(categoriaId: number | null): void {
    this.categoriaSelecionada.set(categoriaId);
    this.paginaAtual.set(0);
    this.carregarPratos();
  }

  onPageChange(event: PageEvent): void {
    this.paginaAtual.set(event.pageIndex);
    this.pageSize = event.pageSize;
    this.carregarPratos();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  adicionarAoCarrinho(prato: Prato): void {
    if (!prato.disponivel) return;
    this.carrinhoService.adicionarItem(prato);
    this.snackBar.open(`✓ ${prato.nome} adicionado!`, '', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }

  diminuirQtd(prato: Prato): void {
    const qtdAtual = this.getQtdNoCarrinho(prato.id);
    this.carrinhoService.alterarQuantidade(prato.id, qtdAtual - 1);
  }

  getQtdNoCarrinho(pratoId: number): number {
    return this.carrinhoService.itensCarrinho()
      .find(i => i.prato.id === pratoId)?.quantidade ?? 0;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/prato-default.jpg';
  }
}
