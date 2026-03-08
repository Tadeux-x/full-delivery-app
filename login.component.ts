import { Component, inject } from '@angular/core';
import { CommonModule }          from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';

import { MatCardModule }      from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatButtonModule }    from '@angular/material/button';
import { MatIconModule }      from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <div class="login-page">
      <mat-card class="login-card">

        <div class="login-header">
          <mat-icon class="logo-icon">restaurant</mat-icon>
          <h1>Comanda Digital</h1>
          <p>Faça login para continuar</p>
        </div>

        @if (carregando) { <mat-progress-bar mode="indeterminate" /> }

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="login-form">

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>E-mail</mat-label>
              <input matInput type="email" formControlName="email"
                     placeholder="seu@email.com" autocomplete="email"/>
              <mat-icon matSuffix>email</mat-icon>
              <mat-error *ngIf="form.get('email')?.hasError('required')">E-mail obrigatório</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('email')">E-mail inválido</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Senha</mat-label>
              <input matInput [type]="mostrarSenha ? 'text' : 'password'"
                     formControlName="senha" autocomplete="current-password"/>
              <button mat-icon-button matSuffix type="button"
                      (click)="mostrarSenha = !mostrarSenha">
                <mat-icon>{{ mostrarSenha ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error>Senha obrigatória</mat-error>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit"
                    class="w-100 btn-login" [disabled]="form.invalid || carregando">
              <mat-icon>login</mat-icon>
              {{ carregando ? 'Entrando...' : 'Entrar' }}
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <p class="register-link">
            Não tem conta?
            <a routerLink="/registrar" mat-button color="primary">Cadastre-se</a>
          </p>
        </mat-card-actions>

      </mat-card>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e65c00 0%, #f9d423 100%);
      padding: 16px;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      border-radius: 20px !important;
      overflow: hidden;
    }

    .login-header {
      text-align: center;
      padding: 32px 24px 24px;
      background: linear-gradient(135deg, #e65c00, #f9d423);
      color: white;

      .logo-icon { font-size: 56px; height: 56px; width: 56px; margin-bottom: 8px; }
      h1 { margin: 0; font-size: 1.8rem; font-weight: 800; }
      p  { margin: 4px 0 0; opacity: 0.9; }
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 24px 0 0;
    }

    .btn-login {
      height: 48px;
      font-size: 1rem;
      margin-top: 8px;
    }

    .w-100 { width: 100%; }

    .register-link {
      text-align: center;
      color: #666;
      margin: 0;
      width: 100%;
    }
  `]
})
export class LoginComponent {
  private fb       = inject(FormBuilder);
  private auth     = inject(AuthService);
  private router   = inject(Router);
  private route    = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  carregando  = false;
  mostrarSenha = false;

  onSubmit(): void {
    if (this.form.invalid) return;

    this.carregando = true;
    const { email, senha } = this.form.value;

    this.auth.login({ email: email!, senha: senha! }).subscribe({
      next: () => {
        this.carregando = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/cardapio';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.carregando = false;
        const msg = err.status === 401
          ? 'E-mail ou senha incorretos.'
          : 'Erro ao fazer login. Tente novamente.';
        this.snackBar.open(msg, 'Fechar', { duration: 5000, panelClass: ['snack-error'] });
      }
    });
  }
}
