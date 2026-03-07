// ============================================================
// checkout.component.ts
// Componente Angular — Checkout com Reactive Forms
// ============================================================
import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule
} from '@angular/forms';

import { CarrinhoService } from '../../../core/services/carrinho.service';
import { PedidoService }   from '../../../core/services/pedido.service';
import { AuthService }     from '../../../core/services/auth.service';
import { PedidoRequest, FormaPagamento, TipoEntrega } from '../../../core/models/pedido.model';

// Angular Material
import { MatStepperModule }  from '@angular/material/stepper';
import { MatButtonModule }   from '@angular/material/button';
import { MatIconModule }     from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }    from '@angular/material/input';
import { MatRadioModule }    from '@angular/material/radio';
import { MatDividerModule }  from '@angular/material/divider';
import { MatCardModule }     from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatStepperModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatRadioModule,
    MatDividerModule, MatCardModule, MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <div class="checkout-container">
      <h2 class="page-title">
        <mat-icon>receipt_long</mat-icon> Finalizar Pedido
      </h2>

      <mat-stepper [linear]="true" #stepper>

        <!-- ── Step 1: Entrega ────────────────────────────────────────── -->
        <mat-step [stepControl]="entregaForm" label="Entrega">
          <form [formGroup]="entregaForm" class="step-form">

            <h3>Como você quer receber?</h3>

            <mat-radio-group formControlName="tipoEntrega" class="tipo-entrega-group">
              <mat-card class="opcao-card"
                        [class.selected]="entregaForm.get('tipoEntrega')?.value === 'ENTREGA'"
                        (click)="entregaForm.get('tipoEntrega')?.setValue('ENTREGA')">
                <mat-radio-button value="ENTREGA">
                  <div class="opcao-content">
                    <mat-icon>delivery_dining</mat-icon>
                    <div>
                      <strong>Entrega</strong>
                      <p>Receba no seu endereço (+R$ 5,00)</p>
                    </div>
                  </div>
                </mat-radio-button>
              </mat-card>

              <mat-card class="opcao-card"
                        [class.selected]="entregaForm.get('tipoEntrega')?.value === 'RETIRADA'"
                        (click)="entregaForm.get('tipoEntrega')?.setValue('RETIRADA')">
                <mat-radio-button value="RETIRADA">
                  <div class="opcao-content">
                    <mat-icon>store</mat-icon>
                    <div>
                      <strong>Retirada</strong>
                      <p>Retire no balcão (sem taxa)</p>
                    </div>
                  </div>
                </mat-radio-button>
              </mat-card>
            </mat-radio-group>

            @if (entregaForm.get('tipoEntrega')?.value === 'ENTREGA') {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Endereço de entrega</mat-label>
                <textarea matInput formControlName="enderecoEntrega" rows="3"
                          placeholder="Rua, número, bairro, complemento"></textarea>
                <mat-error>Informe o endereço de entrega</mat-error>
              </mat-form-field>
            }

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Observações (opcional)</mat-label>
              <input matInput formControlName="observacao"
                     placeholder="Ex: Sem cebola, entregar na portaria..."/>
            </mat-form-field>

            <div class="step-actions">
              <button mat-raised-button color="primary" matStepperNext
                      [disabled]="entregaForm.invalid">
                Continuar <mat-icon>arrow_forward</mat-icon>
              </button>
            </div>
          </form>
        </mat-step>

        <!-- ── Step 2: Pagamento ──────────────────────────────────────── -->
        <mat-step [stepControl]="pagamentoForm" label="Pagamento">
          <form [formGroup]="pagamentoForm" class="step-form">

            <h3>Forma de pagamento</h3>

            <mat-radio-group formControlName="formaPagamento" class="pagamento-group">
              @for (op of opcoesPagamento; track op.value) {
                <mat-card class="opcao-card"
                          [class.selected]="pagamentoForm.get('formaPagamento')?.value === op.value"
                          (click)="pagamentoForm.get('formaPagamento')?.setValue(op.value)">
                  <mat-radio-button [value]="op.value">
                    <div class="opcao-content">
                      <mat-icon>{{ op.icon }}</mat-icon>
                      <span>{{ op.label }}</span>
                    </div>
                  </mat-radio-button>
                </mat-card>
              }
            </mat-radio-group>

            <div class="step-actions">
              <button mat-button matStepperPrevious>
                <mat-icon>arrow_back</mat-icon> Voltar
              </button>
              <button mat-raised-button color="primary" matStepperNext
                      [disabled]="pagamentoForm.invalid">
                Revisar pedido <mat-icon>arrow_forward</mat-icon>
              </button>
            </div>
          </form>
        </mat-step>

        <!-- ── Step 3: Revisão ────────────────────────────────────────── -->
        <mat-step label="Confirmar">
          <div class="resumo-container">
            <h3>Resumo do pedido</h3>

            <!-- Itens -->
            <mat-card class="resumo-card">
              @for (item of carrinhoService.itensCarrinho(); track item.prato.id) {
                <div class="resumo-item">
                  <div class="item-info">
                    <span class="item-qty">{{ item.quantidade }}x</span>
                    <span class="item-nome">{{ item.prato.nome }}</span>
                  </div>
                  <span class="item-preco">
                    {{ item.prato.precoVenda * item.quantidade | currency:'BRL':'symbol':'1.2-2' }}
                  </span>
                </div>
              }

              <mat-divider class="divider"/>

              <div class="resumo-linha">
                <span>Subtotal</span>
                <span>{{ carrinhoService.subtotal() | currency:'BRL':'symbol':'1.2-2' }}</span>
              </div>
              <div class="resumo-linha">
                <span>Taxa de entrega</span>
                <span>{{ taxaEntrega | currency:'BRL':'symbol':'1.2-2' }}</span>
              </div>
              <div class="resumo-linha total">
                <strong>Total</strong>
                <strong>{{ total | currency:'BRL':'symbol':'1.2-2' }}</strong>
              </div>
            </mat-card>

            <!-- Dados de entrega -->
            <mat-card class="resumo-card">
              <p><strong>Entrega:</strong> {{ entregaForm.get('tipoEntrega')?.value }}</p>
              @if (entregaForm.get('enderecoEntrega')?.value) {
                <p><strong>Endereço:</strong> {{ entregaForm.get('enderecoEntrega')?.value }}</p>
              }
              <p><strong>Pagamento:</strong> {{ getLabelPagamento() }}</p>
            </mat-card>

            @if (enviando) {
              <mat-progress-bar mode="indeterminate" />
            }

            <div class="step-actions">
              <button mat-button matStepperPrevious [disabled]="enviando">
                <mat-icon>arrow_back</mat-icon> Voltar
              </button>
              <button mat-raised-button color="accent"
                      [disabled]="enviando"
                      (click)="confirmarPedido()">
                <mat-icon>check_circle</mat-icon>
                {{ enviando ? 'Processando...' : 'Confirmar Pedido' }}
              </button>
            </div>
          </div>
        </mat-step>

      </mat-stepper>
    </div>
  `,
  styles: [`
    .checkout-container {
      max-width: 640px;
      margin: 24px auto;
      padding: 0 16px;
    }

    .page-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.5rem;
      margin-bottom: 24px;
      color: #333;
    }

    .step-form { padding: 24px 0; }

    h3 { font-size: 1.1rem; color: #555; margin-bottom: 16px; }

    .tipo-entrega-group,
    .pagamento-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .opcao-card {
      padding: 12px 16px !important;
      cursor: pointer;
      border: 2px solid transparent !important;
      border-radius: 12px !important;
      transition: border-color 0.2s, background 0.2s;

      &.selected {
        border-color: #e65c00 !important;
        background: #fff8f5 !important;
      }
    }

    .opcao-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 0;

      mat-icon { color: #e65c00; }
      p { margin: 2px 0 0; font-size: 0.8rem; color: #777; }
    }

    .full-width { width: 100%; margin-bottom: 16px; }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }

    /* Resumo */
    .resumo-container { padding: 24px 0; }
    .resumo-card { padding: 16px !important; margin-bottom: 16px !important; border-radius: 12px !important; }

    .resumo-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }

    .item-info { display: flex; gap: 8px; align-items: center; }
    .item-qty { background: #f0f0f0; border-radius: 4px; padding: 2px 8px; font-weight: 700; }
    .item-nome { font-size: 0.95rem; }
    .item-preco { font-weight: 600; }

    .divider { margin: 12px 0 !important; }

    .resumo-linha {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 0.95rem;
      color: #555;

      &.total {
        font-size: 1.1rem;
        color: #333;
        border-top: 2px solid #f0f0f0;
        margin-top: 8px;
        padding-top: 12px;
      }
    }
  `]
})
export class CheckoutComponent implements OnInit {
  private fb        = inject(FormBuilder);
  carrinhoService   = inject(CarrinhoService);
  private pedidoSvc = inject(PedidoService);
  private auth      = inject(AuthService);
  private router    = inject(Router);
  private snackBar  = inject(MatSnackBar);

  entregaForm!:  FormGroup;
  pagamentoForm!: FormGroup;
  enviando = false;

  opcoesPagamento: Array<{value: FormaPagamento; label: string; icon: string}> = [
    { value: 'PIX',            label: 'PIX (aprovação imediata)', icon: 'qr_code_2' },
    { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito',         icon: 'credit_card' },
    { value: 'CARTAO_DEBITO',  label: 'Cartão de Débito',          icon: 'payment' },
    { value: 'DINHEIRO',       label: 'Dinheiro',                  icon: 'payments' },
  ];

  get taxaEntrega(): number {
    return this.entregaForm?.get('tipoEntrega')?.value === 'ENTREGA' ? 5.0 : 0;
  }

  get total(): number {
    return this.carrinhoService.subtotal() + this.taxaEntrega;
  }

  ngOnInit(): void {
    if (this.carrinhoService.totalItens() === 0) {
      this.router.navigate(['/cardapio']);
      return;
    }

    this.entregaForm = this.fb.group({
      tipoEntrega:     ['ENTREGA', Validators.required],
      enderecoEntrega: [''],
      observacao:      [''],
    });

    this.pagamentoForm = this.fb.group({
      formaPagamento: ['PIX', Validators.required],
    });

    // Validação dinâmica de endereço
    this.entregaForm.get('tipoEntrega')?.valueChanges.subscribe(tipo => {
      const ctrl = this.entregaForm.get('enderecoEntrega');
      tipo === 'ENTREGA'
        ? ctrl?.setValidators(Validators.required)
        : ctrl?.clearValidators();
      ctrl?.updateValueAndValidity();
    });
  }

  getLabelPagamento(): string {
    const val = this.pagamentoForm.get('formaPagamento')?.value;
    return this.opcoesPagamento.find(o => o.value === val)?.label ?? val;
  }

  confirmarPedido(): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }

    this.enviando = true;

    const pedido: PedidoRequest = {
      tipoEntrega:     this.entregaForm.get('tipoEntrega')?.value as TipoEntrega,
      enderecoEntrega: this.entregaForm.get('enderecoEntrega')?.value,
      formaPagamento:  this.pagamentoForm.get('formaPagamento')?.value as FormaPagamento,
      observacao:      this.entregaForm.get('observacao')?.value,
      itens: this.carrinhoService.itensCarrinho().map(i => ({
        pratoId:    i.prato.id,
        quantidade: i.quantidade,
        observacao: i.observacao,
      })),
    };

    this.pedidoSvc.criar(pedido).subscribe({
      next: (response) => {
        this.carrinhoService.limpar();
        this.enviando = false;
        this.router.navigate(['/pedido-confirmado'], {
          queryParams: { numero: response.numeroPedido }
        });
      },
      error: (err) => {
        this.enviando = false;
        const msg = err.error?.mensagem ?? 'Erro ao criar pedido. Tente novamente.';
        this.snackBar.open(msg, 'Fechar', { duration: 5000, panelClass: ['snack-error'] });
      }
    });
  }
}
