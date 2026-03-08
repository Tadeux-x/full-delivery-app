import {
  Component, OnInit, inject, signal
} from '@angular/core';
import { CommonModule }  from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  FormArray, FormBuilder, FormGroup,
  ReactiveFormsModule, Validators
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { switchMap }  from 'rxjs';

import { MatCardModule }          from '@angular/material/card';
import { MatFormFieldModule }     from '@angular/material/form-field';
import { MatInputModule }         from '@angular/material/input';
import { MatButtonModule }        from '@angular/material/button';
import { MatIconModule }          from '@angular/material/icon';
import { MatSelectModule }        from '@angular/material/select';
import { MatTableModule }         from '@angular/material/table';
import { MatDividerModule }       from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule }   from '@angular/material/progress-bar';
import { MatTooltipModule }       from '@angular/material/tooltip';

import { environment } from '../../../../environments/environment';

interface IngredienteOption { id: number; nome: string; unidadeMedida: string; custoUnitario: number; }
interface FichaTecnicaResp  {
  pratoId: number; pratoNome: string; custoTotal: number;
  precoVenda: number; margemLucro: number;
  itens: Array<{
    id: number; ingredienteId: number; ingredienteNome: string;
    unidadeMedida: string; quantidade: number; fatorCorrecao: number;
    rendimento: number; custoItem: number;
  }>;
}

@Component({
  selector: 'app-ficha-tecnica',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSelectModule, MatTableModule, MatDividerModule,
    MatSnackBarModule, MatProgressBarModule, MatTooltipModule,
  ],
  template: `
    <div class="ft-page">
      <h2 class="page-title">
        <mat-icon>calculate</mat-icon>
        Ficha Técnica — {{ fichaTecnica()?.pratoNome ?? 'Carregando...' }}
      </h2>

      @if (carregando) { <mat-progress-bar mode="indeterminate" /> }

      <div class="ft-layout">

        <!-- ── Formulário ─────────────────────────────────────────── -->
        <mat-card class="ft-form-card">
          <mat-card-header>
            <mat-card-title>Ingredientes da Receita</mat-card-title>
            <mat-card-subtitle>
              Fórmula: Custo = (Qtd × Fator × CustoUnit) / Rendimento
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="form">
              <div formArrayName="itens">
                @for (item of itensArray.controls; track $index; let i = $index) {
                  <div [formGroupName]="i" class="item-row">

                    <!-- Ingrediente -->
                    <mat-form-field appearance="outline" class="field-ingrediente">
                      <mat-label>Ingrediente</mat-label>
                      <mat-select formControlName="ingredienteId">
                        @for (ing of ingredientes(); track ing.id) {
                          <mat-option [value]="ing.id">
                            {{ ing.nome }} ({{ ing.unidadeMedida }})
                          </mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <!-- Quantidade -->
                    <mat-form-field appearance="outline" class="field-num">
                      <mat-label>Quantidade</mat-label>
                      <input matInput type="number" formControlName="quantidade"
                             min="0.0001" step="0.01"/>
                      <mat-hint>{{ getUnidade(i) }}</mat-hint>
                    </mat-form-field>

                    <!-- Fator de Correção -->
                    <mat-form-field appearance="outline" class="field-num">
                      <mat-label>Fator Correção</mat-label>
                      <input matInput type="number" formControlName="fatorCorrecao"
                             min="0.0001" step="0.01"/>
                      <mat-icon matSuffix
                        matTooltip="Ex: 1.10 = 10% de perda no pré-preparo">
                        help_outline
                      </mat-icon>
                    </mat-form-field>

                    <!-- Rendimento -->
                    <mat-form-field appearance="outline" class="field-num">
                      <mat-label>Rendimento</mat-label>
                      <input matInput type="number" formControlName="rendimento"
                             min="0.0001" step="0.01" max="1"/>
                      <mat-icon matSuffix
                        matTooltip="Ex: 0.95 = 95% de aproveitamento após cocção">
                        help_outline
                      </mat-icon>
                    </mat-form-field>

                    <!-- Custo calculado (read-only) -->
                    <div class="custo-item">
                      <span class="custo-label">Custo</span>
                      <span class="custo-valor">{{ calcularCustoItem(i) | currency:'BRL':'symbol':'1.4-4' }}</span>
                    </div>

                    <!-- Remover -->
                    <button mat-icon-button color="warn" type="button"
                            (click)="removerItem(i)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                }
              </div>

              <button mat-stroked-button color="primary" type="button"
                      class="btn-add-ing" (click)="adicionarItem()">
                <mat-icon>add</mat-icon> Adicionar Ingrediente
              </button>
            </form>
          </mat-card-content>

          <mat-card-actions align="end">
            <button mat-raised-button color="primary"
                    [disabled]="form.invalid || carregando"
                    (click)="salvar()">
              <mat-icon>save</mat-icon> Salvar Ficha Técnica
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- ── Resumo de Custo ────────────────────────────────────── -->
        <mat-card class="custo-card">
          <mat-card-header>
            <mat-card-title>💰 Análise de Custo</mat-card-title>
          </mat-card-header>
          <mat-card-content>

            <div class="custo-linha">
              <span>Custo Total</span>
              <strong class="custo-destaque">
                {{ custoTotalCalculado | currency:'BRL':'symbol':'1.4-4' }}
              </strong>
            </div>
            <div class="custo-linha">
              <span>Preço de Venda</span>
              <span>{{ fichaTecnica()?.precoVenda | currency:'BRL':'symbol':'1.2-2' }}</span>
            </div>

            <mat-divider class="divider" />

            <div class="custo-linha">
              <span>Margem de Lucro</span>
              <strong [class.margem-ok]="margemCalculada >= 30"
                      [class.margem-alerta]="margemCalculada < 30">
                {{ margemCalculada.toFixed(2) }}%
              </strong>
            </div>

            <div class="margem-bar">
              <div class="margem-fill"
                   [style.width]="margemCalculada + '%'"
                   [class.fill-ok]="margemCalculada >= 30"
                   [class.fill-alerta]="margemCalculada < 30">
              </div>
            </div>

            <p class="margem-dica">
              @if (margemCalculada >= 50) { ✅ Excelente margem! }
              @else if (margemCalculada >= 30) { 👍 Margem saudável }
              @else if (margemCalculada >= 0)  { ⚠️ Margem baixa — revise o preço }
              @else { 🚨 Custo acima do preço de venda! }
            </p>

            <!-- Tabela de ingredientes atual -->
            @if (fichaTecnica()?.itens?.length) {
              <mat-divider class="divider" />
              <h4>Ficha salva atualmente</h4>
              <table mat-table [dataSource]="fichaTecnica()!.itens" class="ft-table">
                <ng-container matColumnDef="ingrediente">
                  <th mat-header-cell *matHeaderCellDef>Ingrediente</th>
                  <td mat-cell *matCellDef="let r">{{ r.ingredienteNome }}</td>
                </ng-container>
                <ng-container matColumnDef="custo">
                  <th mat-header-cell *matHeaderCellDef>Custo</th>
                  <td mat-cell *matCellDef="let r">
                    {{ r.custoItem | currency:'BRL':'symbol':'1.4-4' }}
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['ingrediente','custo']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['ingrediente','custo'];"></tr>
              </table>
            }
          </mat-card-content>
        </mat-card>

      </div>
    </div>
  `,
  styles: [`
    .ft-page { padding: 24px; max-width: 1200px; margin: 0 auto; }

    .page-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 1.4rem; margin-bottom: 20px;
    }

    .ft-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 20px;
      align-items: start;
      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }

    .ft-form-card, .custo-card { border-radius: 16px !important; }

    /* ── Linhas de ingrediente ────────────────── */
    .item-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .field-ingrediente { flex: 2; min-width: 200px; }
    .field-num         { flex: 1; min-width: 120px; }

    .custo-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 90px;
      padding-top: 8px;
    }

    .custo-label { font-size: 0.7rem; color: #888; }
    .custo-valor { font-weight: 700; color: #e65c00; font-size: 0.9rem; }

    .btn-add-ing { margin-top: 8px; width: 100%; }

    /* ── Custo card ───────────────────────────── */
    .custo-linha {
      display: flex; justify-content: space-between;
      padding: 10px 0; font-size: 0.95rem; color: #555;
    }

    .custo-destaque { font-size: 1.3rem; color: #e65c00; }

    .divider { margin: 12px 0 !important; }

    .margem-ok     { color: #2e7d32; }
    .margem-alerta { color: #c62828; }

    .margem-bar {
      height: 8px; background: #eee;
      border-radius: 4px; overflow: hidden; margin: 8px 0;
    }

    .margem-fill {
      height: 100%; border-radius: 4px;
      transition: width 0.5s;
      max-width: 100%;
      &.fill-ok     { background: #4caf50; }
      &.fill-alerta { background: #f44336; }
    }

    .margem-dica { font-size: 0.85rem; color: #555; margin: 8px 0 0; }

    .ft-table { width: 100%; }
  `]
})
export class FichaTecnicaAdminComponent implements OnInit {
  private fb       = inject(FormBuilder);
  private http     = inject(HttpClient);
  private route    = inject(ActivatedRoute);
  private snack    = inject(MatSnackBar);

  fichaTecnica = signal<FichaTecnicaResp | null>(null);
  ingredientes = signal<IngredienteOption[]>([]);
  carregando   = false;

  form!: FormGroup;

  get itensArray(): FormArray { return this.form.get('itens') as FormArray; }

  get custoTotalCalculado(): number {
    return this.itensArray.controls.reduce((acc, ctrl) => {
      return acc + this.calcularCustoItem(this.itensArray.controls.indexOf(ctrl));
    }, 0);
  }

  get margemCalculada(): number {
    const preco = this.fichaTecnica()?.precoVenda ?? 0;
    if (!preco || !this.custoTotalCalculado) return 0;
    return ((preco - this.custoTotalCalculado) / preco) * 100;
  }

  ngOnInit(): void {
    this.form = this.fb.group({ itens: this.fb.array([]) });

    // Carrega ingredientes disponíveis
    this.http.get<any[]>(`${environment.apiUrl}/admin/estoque`).subscribe(ings => {
      this.ingredientes.set(ings.map(i => ({
        id: i.id, nome: i.nome,
        unidadeMedida: i.unidadeMedida, custoUnitario: i.custoUnitario
      })));
    });

    // Carrega ficha do prato (pratoId vem da rota)
    const pratoId = this.route.snapshot.paramMap.get('pratoId');
    if (pratoId) {
      this.carregando = true;
      this.http.get<FichaTecnicaResp>(`${environment.apiUrl}/admin/fichas-tecnicas/prato/${pratoId}`)
        .subscribe({
          next: ft => {
            this.fichaTecnica.set(ft);
            ft.itens.forEach(item => this.adicionarItemPreenchido(item));
            this.carregando = false;
          },
          error: () => { this.carregando = false; this.adicionarItem(); }
        });
    } else {
      this.adicionarItem();
    }
  }

  adicionarItem(): void {
    this.itensArray.push(this.fb.group({
      ingredienteId:  [null, Validators.required],
      quantidade:     [1, [Validators.required, Validators.min(0.0001)]],
      fatorCorrecao:  [1, [Validators.required, Validators.min(0.0001)]],
      rendimento:     [1, [Validators.required, Validators.min(0.0001), Validators.max(1)]],
    }));
  }

  adicionarItemPreenchido(item: any): void {
    this.itensArray.push(this.fb.group({
      ingredienteId:  [item.ingredienteId, Validators.required],
      quantidade:     [item.quantidade, [Validators.required, Validators.min(0.0001)]],
      fatorCorrecao:  [item.fatorCorrecao, [Validators.required, Validators.min(0.0001)]],
      rendimento:     [item.rendimento, [Validators.required, Validators.min(0.0001)]],
    }));
  }

  removerItem(index: number): void {
    this.itensArray.removeAt(index);
  }

  calcularCustoItem(index: number): number {
    const ctrl = this.itensArray.at(index);
    if (!ctrl) return 0;
    const { ingredienteId, quantidade, fatorCorrecao, rendimento } = ctrl.value;
    const ing = this.ingredientes().find(i => i.id === ingredienteId);
    if (!ing || !rendimento) return 0;
    return (quantidade * fatorCorrecao * ing.custoUnitario) / rendimento;
  }

  getUnidade(index: number): string {
    const ctrl = this.itensArray.at(index);
    const ing = this.ingredientes().find(i => i.id === ctrl?.value?.ingredienteId);
    return ing?.unidadeMedida ?? '';
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.carregando = true;

    const pratoId = this.fichaTecnica()?.pratoId
      ?? +this.route.snapshot.paramMap.get('pratoId')!;

    const body = { pratoId, itens: this.itensArray.value };

    this.http.post<FichaTecnicaResp>(`${environment.apiUrl}/admin/fichas-tecnicas`, body)
      .subscribe({
        next: ft => {
          this.fichaTecnica.set(ft);
          this.carregando = false;
          this.snack.open('✅ Ficha técnica salva com sucesso!', '', {
            duration: 3000, panelClass: ['snack-success']
          });
        },
        error: err => {
          this.carregando = false;
          this.snack.open(err.error?.mensagem ?? 'Erro ao salvar', 'Fechar',
            { duration: 5000, panelClass: ['snack-error'] });
        }
      });
  }
}
