import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

registerLocaleData(localePt, 'pt-BR');

interface Dashboard {
  orders: number;
  revenueCents: number;
  products: number;
  lowStock: number;
  months: { month: string; total: number; cancelled: number }[];
  categories: { name: string; units: number }[];
}

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, MatIconModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly http = inject(HttpClient);
  private readonly untilDestroyed = takeUntilDestroyed<Dashboard>();
  readonly status = signal<'loading' | 'error' | 'loaded'>('loading');
  readonly data = signal<Dashboard | null>(null);
  readonly maxOrders = computed(() => Math.max(1, ...(this.data()?.months.map(month => month.total) ?? [])));
  readonly maxUnits = computed(() => Math.max(1, ...(this.data()?.categories.map(category => category.units) ?? [])));

  constructor() {
    this.load();
  }

  load(): void {
    this.status.set('loading');
    this.http.get<Dashboard>('http://localhost:8080/admin/dashboard').pipe(this.untilDestroyed).subscribe({
      next: data => {
        this.data.set(data);
        this.status.set('loaded');
      },
      error: () => this.status.set('error'),
    });
  }
}