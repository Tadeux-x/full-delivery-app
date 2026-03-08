import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule }  from '@angular/common';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { MatCardModule }          from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule }     from '@angular/material/form-field';
import { MatInputModule }         from '@angular/material/input';
import { MatButtonModule }        from '@angular/material/button';
import { MatIconModule }          from '@angular/material/icon';
import { MatChipsModule }         from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule }   from '@angular/material/progress-bar';
import { MatTooltipModule }       from '@angular/material/tooltip';
import { MatSortModule }          from '@angular/material/sort';

import { environment } from '../../../../environments/environment';

interface Ingrediente {
  id: number; nome: string; unidadeMedida: string;
  custoUnitario: number; quantidadeEstoque: number;
  estoqueMinimo: number; abaixoDoMinimo: boolean;
}

@Component({
  selector: 'app-estoque',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatTableModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatDialogModule,
    MatSnackBarModule, MatProgressBarModule, MatTooltipModule, MatSortModule,
  ],
  template: `
    <div class="estoque-page">
      <div class="page-header">
        <h2><mat-icon>inventory_2</mat-icon> Controle de Estoque</h2>
        <button mat-raised-button color="primary" (click)="abrirFormulario()">
          <mat-icon>add</mat-icon> Novo Ingrediente
        </button>
      </div>

      @if (carregando) { <mat-progress-bar mode="indeterminate" /> }

      <!-- Alertas -->
      @if (alertas().length > 0) {
        <div class="alertas-banner">
          <mat-icon>warning</mat-icon>
          <strong>{{ alertas().length }} ingrediente(s) abaixo do estoque mínimo!</strong>
          <span>{{ alertas().map(a => a.nome).join(', ') }}</span>
        </div>
      }

      <!-- Filtro -->
      <mat-card class="filtro-card">
        <mat-form-field appearance="outline" class="filtro-input">
          <mat-label>Buscar ingrediente</mat-label>
          <input matInput (keyup)="filtrar($event)" placeholder="Ex: carne, queijo..."/>
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </mat-card>

      <!-- Tabela -->
      <mat-card class="tabela-card">
        <table mat-table [dataSource]="dataSource" matSort class="estoque-tabela">

          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Ingrediente</th>
            <td mat-cell *matCellDef="let i">
              <div class="nome-cell">
                <span>{{ i.nome }}</span>
                @if (i.abaixoDoMinimo) {
                  <mat-chip color="warn" highlighted class="chip-alerta">
                    <mat-icon>warning</mat-icon> Estoque baixo
                  </mat-chip>
                }
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="unidade">
            <th mat-header-cell *matHeaderCellDef>Unidade</th>
            <td mat-cell *matCellDef="let i">{{ i.unidadeMedida }}</td>
          </ng-container>

          <ng-container matColumnDef="custo">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Custo Unit.</th>
            <td mat-cell *matCellDef="let i">
              {{ i.custoUnitario | currency:'BRL':'symbol':'1.4-4' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="estoque">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Estoque Atual</th>
            <td mat-cell *matCellDef="let i">
              <span [class.alerta-text]="i.abaixoDoMinimo">
                {{ i.quantidadeEstoque | number:'1.2-4' }} {{ i.unidadeMedida }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="minimo">
            <th mat-header-cell *matHeaderCellDef>Mínimo</th>
            <td mat-cell *matCellDef="let i">
              {{ i.estoqueMinimo | number:'1.2-4' }} {{ i.unidadeMedida }}
            </td>
          </ng-container>

          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef>Ações</th>
            <td mat-cell *matCellDef="let i">
              <button mat-icon-button color="primary"
                      matTooltip="Ajustar Estoque"
                      (click)="abrirAjuste(i)">
                <mat-icon>tune</mat-icon>
              </button>
              <button mat-icon-button
                      matTooltip="Editar"
                      (click)="editar(i)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn"
                      matTooltip="Inativar"
                      (click)="inativar(i)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let row; columns: colunas;"
              [class.row-alerta]="row.abaixoDoMinimo"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell sem-dados" [attr.colspan]="colunas.length">
              Nenhum ingrediente encontrado.
            </td>
          </tr>
        </table>
      </mat-card>

      <!-- ── Painel Lateral (Formulário) ──────────────────────────────────── -->
      @if (mostrarForm) {
        <div class="overlay" (click)="fecharFormulario()"></div>
        <mat-card class="form-panel">
          <div class="form-panel-header">
            <h3>{{ editandoId ? 'Editar' : 'Novo' }} Ingrediente</h3>
            <button mat-icon-button (click)="fecharFormulario()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="salvar()">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Nome</mat-label>
              <input matInput formControlName="nome"/>
              <mat-error>Campo obrigatório</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Unidade de Medida</mat-label>
              <input matInput formControlName="unidadeMedida" placeholder="kg, g, L, mL, un"/>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Custo Unitário (R$)</mat-label>
              <input matInput type="number" formControlName="custoUnitario" min="0" step="0.0001"/>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Quantidade em Estoque</mat-label>
              <input matInput type="number" formControlName="quantidadeEstoque" min="0"/>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Estoque Mínimo (alerta)</mat-label>
              <input matInput type="number" formControlName="estoqueMinimo" min="0"/>
            </mat-form-field>

            <div class="form-acoes">
              <button mat-button type="button" (click)="fecharFormulario()">Cancelar</button>
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="form.invalid || carregando">
                <mat-icon>save</mat-icon> Salvar
              </button>
            </div>
          </form>
        </mat-card>
      }

      <!-- Ajuste de estoque inline -->
      @if (mostrarAjuste) {
        <div class="overlay" (click)="fecharAjuste()"></div>
        <mat-card class="form-panel">
          <div class="form-panel-header">
            <h3>Ajustar Estoque — {{ ingredienteAjuste?.nome }}</h3>
            <button mat-icon-button (click)="fecharAjuste()"><mat-icon>close</mat-icon></button>
          </div>
          <p class="estoque-atual">
            Estoque atual: <strong>{{ ingredienteAjuste?.quantidadeEstoque }} {{ ingredienteAjuste?.unidadeMedida }}</strong>
          </p>
          <form [formGroup]="ajusteForm" (ngSubmit)="salvarAjuste()">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Quantidade (+ entrada / - saída)</mat-label>
              <input matInput type="number" formControlName="quantidade" step="0.01"/>
              <mat-hint>Positivo = entrada, Negativo = saída</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-100 mt-8">
              <mat-label>Motivo</mat-label>
              <input matInput formControlName="motivo"/>
            </mat-form-field>
            <div class="form-acoes">
              <button mat-button type="button" (click)="fecharAjuste()">Cancelar</button>
              <button mat-raised-button color="accent" type="submit"
                      [disabled]="ajusteForm.invalid || carregando">
                Confirmar Ajuste
              </button>
            </div>
          </form>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .estoque-page { padding: 24px; max-width: 1200px; margin: 0 auto; position: relative; }

    .page-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
      h2 { display: flex; align-items: center; gap: 8px; margin: 0; }
    }

    .alertas-banner {
      display: flex; align-items: center; gap: 12px;
      background: #fff3e0; border: 1px solid #ffb300;
      border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;
      mat-icon { color: #f57c00; }
      strong { color: #e65100; }
      span { color: #5d4037; font-size: 0.85rem; }
    }

    .filtro-card { padding: 16px !important; margin-bottom: 16px !important; border-radius: 12px !important; }
    .filtro-input { width: 300px; }

    .tabela-card { border-radius: 12px !important; overflow: hidden; }
    .estoque-tabela { width: 100%; }

    .nome-cell { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .chip-alerta { font-size: 0.7rem !important; height: 20px !important; }
    .alerta-text { color: #c62828; font-weight: 700; }
    .row-alerta { background: #fff8f5; }
    .sem-dados { text-align: center; padding: 32px; color: #999; }

    /* ── Painel lateral ─────────────────────────────── */
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.3);
      z-index: 200; cursor: pointer;
    }

    .form-panel {
      position: fixed; right: 0; top: 0; bottom: 0;
      width: 380px; max-width: 95vw;
      z-index: 201; border-radius: 0 !important;
      overflow-y: auto; padding: 24px !important;
      display: flex; flex-direction: column; gap: 12px;
    }

    .form-panel-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
      h3 { margin: 0; }
    }

    .w-100 { width: 100%; }
    .mt-8  { margin-top: 8px; }

    .form-acoes {
      display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;
    }

    .estoque-atual { margin: 0 0 16px; color: #555; }
  `]
})
export class EstoqueAdminComponent implements OnInit {
  private http  = inject(HttpClient);
  private fb    = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  ingredientes = signal<Ingrediente[]>([]);
  alertas      = signal<Ingrediente[]>([]);
  carregando   = false;

  dataSource = new MatTableDataSource<Ingrediente>([]);
  colunas    = ['nome', 'unidade', 'custo', 'estoque', 'minimo', 'acoes'];

  mostrarForm  = false;
  mostrarAjuste = false;
  editandoId: number | null = null;
  ingredienteAjuste: Ingrediente | null = null;

  form!: FormGroup;
  ajusteForm!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      nome:              ['', Validators.required],
      unidadeMedida:     ['', Validators.required],
      custoUnitario:     [0, [Validators.required, Validators.min(0)]],
      quantidadeEstoque: [0, [Validators.required, Validators.min(0)]],
      estoqueMinimo:     [0, [Validators.required, Validators.min(0)]],
    });
    this.ajusteForm = this.fb.group({
      quantidade: [null, Validators.required],
      motivo:     ['Ajuste manual'],
    });
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.http.get<Ingrediente[]>(`${environment.apiUrl}/admin/estoque`).subscribe({
      next: data => {
        this.ingredientes.set(data);
        this.alertas.set(data.filter(i => i.abaixoDoMinimo));
        this.dataSource.data = data;
        this.carregando = false;
      },
      error: () => this.carregando = false
    });
  }

  filtrar(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  abrirFormulario(): void {
    this.editandoId = null;
    this.form.reset({ custoUnitario: 0, quantidadeEstoque: 0, estoqueMinimo: 0 });
    this.mostrarForm = true;
  }

  editar(ing: Ingrediente): void {
    this.editandoId = ing.id;
    this.form.patchValue(ing);
    this.mostrarForm = true;
  }

  fecharFormulario(): void { this.mostrarForm = false; }

  salvar(): void {
    if (this.form.invalid) return;
    this.carregando = true;
    const url = this.editandoId
      ? `${environment.apiUrl}/admin/estoque/${this.editandoId}`
      : `${environment.apiUrl}/admin/estoque`;
    const req = this.editandoId
      ? this.http.put<Ingrediente>(url, this.form.value)
      : this.http.post<Ingrediente>(url, this.form.value);

    req.subscribe({
      next: () => {
        this.carregando = false;
        this.fecharFormulario();
        this.carregar();
        this.snack.open('✅ Ingrediente salvo!', '', { duration: 3000 });
      },
      error: () => { this.carregando = false; }
    });
  }

  abrirAjuste(ing: Ingrediente): void {
    this.ingredienteAjuste = ing;
    this.ajusteForm.reset({ quantidade: null, motivo: 'Ajuste manual' });
    this.mostrarAjuste = true;
  }

  fecharAjuste(): void { this.mostrarAjuste = false; }

  salvarAjuste(): void {
    if (!this.ingredienteAjuste) return;
    this.carregando = true;
    const { quantidade, motivo } = this.ajusteForm.value;
    this.http.patch(
      `${environment.apiUrl}/admin/estoque/${this.ingredienteAjuste.id}/ajustar`,
      null, { params: { quantidade, motivo } }
    ).subscribe({
      next: () => {
        this.carregando = false;
        this.fecharAjuste();
        this.carregar();
        this.snack.open('✅ Estoque ajustado!', '', { duration: 3000 });
      },
      error: () => this.carregando = false
    });
  }

  inativar(ing: Ingrediente): void {
    if (!confirm(`Inativar "${ing.nome}"?`)) return;
    this.http.delete(`${environment.apiUrl}/admin/estoque/${ing.id}`)
      .subscribe({ next: () => this.carregar() });
  }
}
