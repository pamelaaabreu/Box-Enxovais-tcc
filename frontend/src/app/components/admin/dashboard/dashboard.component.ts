import { CurrencyPipe, DatePipe, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminStateComponent } from '../../../shared/components/admin-state/admin-state.component';
import { PeriodFilterComponent } from '../../../shared/components/period-filter/period-filter.component';
import { DashboardTrendComponent } from './components/dashboard-trend/dashboard-trend.component';
import { Dashboard } from './models/dashboard.models';

registerLocaleData(localePt, 'pt-BR');

@Component({
  selector: 'app-dashboard',
  imports: [
    AdminStateComponent,
    CurrencyPipe,
    DashboardTrendComponent,
    DatePipe,
    MatIconModule,
    PeriodFilterComponent,
    RouterLink,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);

  private request?: Subscription;
  private applied: Record<string, string> = {};

  readonly filter = new FormGroup({
    period: new FormControl('30d', { nonNullable: true }),
    dateFrom: new FormControl('', { nonNullable: true }),
    dateTo: new FormControl('', { nonNullable: true }),
    group: new FormControl('auto', { nonNullable: true }),
  });

  readonly status = signal<'loading' | 'error' | 'loaded'>('loading');
  readonly error = signal('');
  readonly data = signal<Dashboard | null>(null);

  readonly productChartItems = computed(() => {
    const products = this.data()?.topProducts ?? [];
    const formatted = products.map((product) => ({
      productId: product.productId,
      fullName:
        product.archived &&
        !product.name.toLocaleLowerCase('pt-BR').includes('arquivado')
          ? `${product.name} (arquivado)`
          : product.name,
      units: product.units,
    }));
    const max = Math.max(1, ...formatted.map((product) => product.units));

    return formatted.slice(0, 5).map((product) => ({
      ...product,
      shortName: this.compactLabel(product.fullName, 30),
      percent: Math.max(8, Math.round((product.units / max) * 100)),
    }));
  });

  readonly totalTopProductUnits = computed(() =>
    this.productChartItems().reduce(
      (accumulator, product) => accumulator + product.units,
      0,
    ),
  );

  readonly categoryChartItems = computed(() => {
    const categories = this.data()?.categories ?? [];
    const max = Math.max(1, ...categories.map((category) => category.units));

    return categories.slice(0, 5).map((category) => ({
      name: category.name,
      fullName: category.name,
      shortName: this.compactLabel(category.name, 28),
      units: category.units,
      percent: Math.max(8, Math.round((category.units / max) * 100)),
    }));
  });

  readonly totalCategoryUnits = computed(() =>
    this.categoryChartItems().reduce(
      (accumulator, category) => accumulator + category.units,
      0,
    ),
  );

  readonly statusSegments = computed(() => {
    const dashboard = this.data();
    const total = Math.max(0, dashboard?.orders ?? 0);
    const approved = Math.max(0, dashboard?.approvedOrders ?? 0);
    const cancelled = Math.max(0, dashboard?.cancelledOrders ?? 0);
    const others = Math.max(0, total - approved - cancelled);

    const segments = [
      { name: 'Aprovados', value: approved, color: '#71855c' },
      { name: 'Cancelados', value: cancelled, color: '#d1c7b5' },
    ];

    if (others > 0) {
      segments.push({ name: 'Outros', value: others, color: '#cf9f8f' });
    }

    return segments.map((segment) => ({
      ...segment,
      percent: total > 0 ? Math.round((segment.value / total) * 100) : 0,
    }));
  });

  readonly statusDonutBackground = computed(() => {
    const dashboard = this.data();
    const total = Math.max(0, dashboard?.orders ?? 0);
    const approved = Math.max(0, dashboard?.approvedOrders ?? 0);
    const cancelled = Math.max(0, dashboard?.cancelledOrders ?? 0);
    const approvedEnd = total > 0 ? (approved / total) * 100 : 0;
    const cancelledEnd = total > 0 ? ((approved + cancelled) / total) * 100 : 0;

    return `conic-gradient(#71855c 0% ${approvedEnd}%, #d1c7b5 ${approvedEnd}% ${cancelledEnd}%, #cf9f8f ${cancelledEnd}% 100%)`;
  });

  readonly statusChartDescription = computed(
    () =>
      `Pedidos por status. ${this.statusSegments()
        .map(
          (segment) =>
            `${segment.name}: ${segment.value} (${segment.percent}%)`,
        )
        .join('; ')}.`,
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.filter.setValue({
        period: params.get('period') ?? '30d',
        dateFrom: params.get('dateFrom') ?? '',
        dateTo: params.get('dateTo') ?? '',
        group: params.get('group') ?? 'auto',
      });
      this.applied = this.params();
      this.load();
    });
  }

  private params(): Record<string, string> {
    const filter = this.filter.getRawValue();
    const params: Record<string, string> = {
      period: filter.period,
      group: filter.group,
    };

    if (filter.period === 'custom') {
      params['dateFrom'] = filter.dateFrom;
      params['dateTo'] = filter.dateTo;
    }

    return params;
  }

  private compactLabel(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 1).trimEnd()}…`;
  }

  apply(): void {
    const params = this.params();

    if (JSON.stringify(params) === JSON.stringify(this.applied)) {
      this.load();
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
    });
  }

  load(): void {
    this.request?.unsubscribe();
    this.status.set('loading');
    this.error.set('');

    this.request = this.http
      .get<Dashboard>('http://localhost:8080/admin/dashboard', {
        params: new HttpParams({ fromObject: this.applied }),
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (dashboard) => {
          this.data.set(dashboard);
          this.status.set('loaded');
        },
        error: (error) => {
          this.error.set(
            error.status === 400
              ? (error.error?.message ?? 'Revise o período selecionado.')
              : 'Não foi possível carregar os indicadores. Tente novamente.',
          );
          this.status.set('error');
        },
      });
  }
}
