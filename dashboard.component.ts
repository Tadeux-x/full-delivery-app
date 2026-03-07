// ============================================================
// dashboard.component.ts
// Painel Admin com KPIs e Chart.js
// ============================================================
import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, inject, signal
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { HttpClient }     from '@angular/common/http';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Angular Material
import { MatCardModule }          from '@angular/material/card';
import { MatIconModule }          from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule }         from '@angular/material/chips';
import { MatTableModule }         from '@angular/material/table';
import { MatButtonModule }        from '@angular/material/button';

import { environment } from '../../../../environments/environment';

Chart.register(...registerables);

interface DashboardData {
  faturamentoHoje:    number;
  faturamentoMes:     number;
  pedidosHoje:        number;
  pedidosMes:         number;
  pedidosEmAndamento: number;
  top5Pratos: Array<{ pratoId: number; pratoNome: string; totalVendido: number }>;
  alertasEstoque: Array<{
    id: number; nome: string; quantidadeEstoque: number;
    estoqueMinimo: number; unidadeMedida: string;
  }>;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule,
    MatProgressSpinnerModule, MatChipsModule,
    MatTableModule, MatButtonModule,
  ],
  template: `
    <div class="dashboard">
      <h2 class="page-title">
        <mat-icon>dashboard</mat-icon> Dashboard
        <button mat-icon-button (click)="carregar()" title="Atualizar">
          <mat-icon>refresh</mat-icon>
        </button>
      </h2>

      @if (carregando()) {
        <div class="loading"><mat-spinner diameter="48" /></div>
      }

      @if (!carregando() && dados()) {
        <!-- ── KPIs ────────────────────────────────────────────────── -->
        <section class="kpi-grid">
          <mat-card class="kpi-card verde">
            <mat-icon class="kpi-icon">trending_up</mat-icon>
            <div class="kpi-info">
              <p class="kpi-label">Faturamento Hoje</p>
              <p class="kpi-value">{{ dados()!.faturamentoHoje | currency:'BRL':'symbol':'1.2-2' }}</p>
            </div>
          </mat-card>

          <mat-card class="kpi-card azul">
            <mat-icon class="kpi-icon">calendar_month</mat-icon>
            <div class="kpi-info">
              <p class="kpi-label">Faturamento do Mês</p>
              <p class="kpi-value">{{ dados()!.faturamentoMes | currency:'BRL':'symbol':'1.2-2' }}</p>
            </div>
          </mat-card>

          <mat-card class="kpi-card laranja">
            <mat-icon class="kpi-icon">receipt</mat-icon>
            <div class="kpi-info">
              <p class="kpi-label">Pedidos Hoje</p>
              <p class="kpi-value">{{ dados()!.pedidosHoje }}</p>
            </div>
          </mat-card>

          <mat-card class="kpi-card roxo">
            <mat-icon class="kpi-icon">pending_actions</mat-icon>
            <div class="kpi-info">
              <p class="kpi-label">Em Andamento</p>
              <p class="kpi-value">{{ dados()!.pedidosEmAndamento }}</p>
            </div>
          </mat-card>
        </section>

        <!-- ── Gráficos ───────────────────────────────────────────── -->
        <section class="charts-grid">
          <!-- Top 5 Pratos -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>🏆 Top 5 Pratos Mais Vendidos</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <canvas #top5Chart></canvas>
            </mat-card-content>
          </mat-card>

          <!-- Faturamento Semana (mock) -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>📈 Faturamento — Últimos 7 dias</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <canvas #faturamentoChart></canvas>
            </mat-card-content>
          </mat-card>
        </section>

        <!-- ── Alertas de Estoque ─────────────────────────────────── -->
        @if (dados()!.alertasEstoque.length > 0) {
          <mat-card class="alertas-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon color="warn">warning</mat-icon>
                Alertas de Estoque Mínimo ({{ dados()!.alertasEstoque.length }})
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <table mat-table [dataSource]="dados()!.alertasEstoque" class="alertas-table">
                <ng-container matColumnDef="ingrediente">
                  <th mat-header-cell *matHeaderCellDef>Ingrediente</th>
                  <td mat-cell *matCellDef="let ing">{{ ing.nome }}</td>
                </ng-container>
                <ng-container matColumnDef="estoque">
                  <th mat-header-cell *matHeaderCellDef>Estoque Atual</th>
                  <td mat-cell *matCellDef="let ing">
                    <mat-chip color="warn" highlighted>
                      {{ ing.quantidadeEstoque }} {{ ing.unidadeMedida }}
                    </mat-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="minimo">
                  <th mat-header-cell *matHeaderCellDef>Estoque Mínimo</th>
                  <td mat-cell *matCellDef="let ing">{{ ing.estoqueMinimo }} {{ ing.unidadeMedida }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="colunasAlerta"></tr>
                <tr mat-row *matRowDef="let row; columns: colunasAlerta;"
                    class="alerta-row"></tr>
              </table>
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.5rem;
      margin-bottom: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 64px;
    }

    /* ── KPIs ─────────────────────────────────────── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      padding: 20px !important;
      border-radius: 16px !important;
      display: flex !important;
      align-items: center;
      gap: 16px;
      color: white;

      &.verde  { background: linear-gradient(135deg, #11998e, #38ef7d); }
      &.azul   { background: linear-gradient(135deg, #2193b0, #6dd5ed); }
      &.laranja { background: linear-gradient(135deg, #e65c00, #f9d423); }
      &.roxo   { background: linear-gradient(135deg, #7b2ff7, #f107a3); }
    }

    .kpi-icon { font-size: 40px !important; height: 40px !important; width: 40px !important; opacity: 0.8; }

    .kpi-label { margin: 0; font-size: 0.85rem; opacity: 0.9; }
    .kpi-value { margin: 4px 0 0; font-size: 1.6rem; font-weight: 800; }

    /* ── Charts ───────────────────────────────────── */
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;

      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }

    .chart-card {
      border-radius: 16px !important;
      padding: 0 !important;

      mat-card-content { padding: 16px !important; }
    }

    /* ── Alertas ──────────────────────────────────── */
    .alertas-card {
      border-radius: 16px !important;
      border-left: 4px solid #f44336 !important;
    }

    .alertas-table { width: 100%; }

    .alerta-row { background: #fff8f8; }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('top5Chart')      top5Ref!:       ElementRef<HTMLCanvasElement>;
  @ViewChild('faturamentoChart') fatRef!:      ElementRef<HTMLCanvasElement>;

  private http = inject(HttpClient);

  dados      = signal<DashboardData | null>(null);
  carregando = signal(false);

  colunasAlerta = ['ingrediente', 'estoque', 'minimo'];

  private chartTop5?: Chart;
  private chartFat?:  Chart;

  ngOnInit(): void { this.carregar(); }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.chartTop5?.destroy();
    this.chartFat?.destroy();
  }

  carregar(): void {
    this.carregando.set(true);
    this.http.get<DashboardData>(`${environment.apiUrl}/admin/dashboard`)
      .subscribe({
        next: data => {
          this.dados.set(data);
          this.carregando.set(false);
          setTimeout(() => this.renderCharts(), 100);
        },
        error: () => this.carregando.set(false)
      });
  }

  private renderCharts(): void {
    const d = this.dados();
    if (!d) return;

    this.chartTop5?.destroy();
    this.chartFat?.destroy();

    // ── Top 5 Pratos (Bar Horizontal) ─────────────────────────────────
    this.chartTop5 = new Chart(this.top5Ref.nativeElement, {
      type: 'bar',
      data: {
        labels: d.top5Pratos.map(p => p.pratoNome),
        datasets: [{
          label: 'Unidades Vendidas',
          data:  d.top5Pratos.map(p => p.totalVendido),
          backgroundColor: [
            '#e65c00', '#f9a825', '#43a047', '#1e88e5', '#8e24aa'
          ],
          borderRadius: 8,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    } as ChartConfiguration);

    // ── Faturamento 7 dias (Line) — dados simulados ────────────────────
    const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const faturamentoMock = dias.map(() => Math.random() * 800 + 200);

    this.chartFat = new Chart(this.fatRef.nativeElement, {
      type: 'line',
      data: {
        labels: dias,
        datasets: [{
          label: 'Faturamento (R$)',
          data: faturamentoMock,
          borderColor: '#e65c00',
          backgroundColor: 'rgba(230,92,0,0.15)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#e65c00',
          pointRadius: 5,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true,
               ticks: { callback: v => 'R$ ' + v } }
        }
      }
    });
  }
}
