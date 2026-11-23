import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { AdminKpiCardComponent } from '../../../shared/components/admin-kpi-card/admin-kpi-card.component';
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
import type { EChartsOption } from 'echarts';
import { EchartComponent } from '../../../shared/components/echart/echart.component';
import { HintDirective } from '../../../shared/directives/hint.directive';
import {
  bucketLabel,
  dateLabelInterval,
  periodLabels,
} from '../../../shared/components/chart/chart-dates';
import { chartTooltipOptions } from '../../../shared/components/chart/echarts-tooltip';
import type { Dashboard, DashboardPoint } from './models/dashboard.models';
registerLocaleData(localePt, 'pt-BR');
@Component({
  selector: 'app-dashboard',
  imports: [StatusBadgeComponent,
    AdminStateComponent,
    AdminKpiCardComponent,
    CurrencyPipe,
    EchartComponent,
    HintDirective,
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
  readonly displayedPeriod = computed(() => {
    const period = this.data()?.period;
    return period
      ? periodLabels(period.from, period.until, period.timezone)
      : { from: '', until: '' };
  });
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
    return formatted.slice(0, 5);
  });
  readonly totalTopProductUnits = computed(() =>
    this.productChartItems().reduce(
      (accumulator, product) => accumulator + product.units,
      0,
    ),
  );
  readonly categoryChartItems = computed(() => {
    const categories = this.data()?.categories ?? [];
    return categories.slice(0, 5).map((category) => ({
      fullName: category.name,
      units: category.units,
    }));
  });
  readonly totalCategoryUnits = computed(() =>
    this.categoryChartItems().reduce(
      (accumulator, category) => accumulator + category.units,
      0,
    ),
  );
  readonly stockGroups = computed(() => {
    const groups = new Map<
      number,
      {
        productId: number;
        name: string;
        totalQuantity: number;
        variants: Dashboard['stock'];
      }
    >();
    for (const item of this.data()?.stock ?? []) {
      let group = groups.get(item.productId);
      if (!group) {
        group = {
          productId: item.productId,
          name: item.name,
          totalQuantity: item.totalQuantity,
          variants: [],
        };
        groups.set(item.productId, group);
      }
      group.variants.push(item);
    }
    return [...groups.values()];
  });
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
  readonly statusChartDescription = computed(
    () =>
      `Pedidos por status. ${this.statusSegments()
        .map(
          (segment) =>
            `${segment.name}: ${segment.value} (${segment.percent}%)`,
        )
        .join('; ')}.`,
  );
  private readonly currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  readonly revenueOption = computed<EChartsOption>(() => {
    const points = this.temporalData('revenueCents');
    return this.barOption(
      points.labels,
      points.values.map((value) => value / 100),
      'Faturamento',
      true,
      false,
      points.fullLabels,
    );
  });
  readonly customersOption = computed<EChartsOption>(() => {
    const points = this.temporalData('customers');
    return this.barOption(
      points.labels,
      points.values,
      'Novos clientes',
      false,
      false,
      points.fullLabels,
    );
  });
  readonly ordersOption = computed<EChartsOption>(() => {
    const points = this.temporalData('orders');
    return this.barOption(
      points.labels,
      points.values,
      'Pedidos',
      false,
      false,
      points.fullLabels,
    );
  });
  readonly productsOption = computed<EChartsOption>(() =>
    this.barOption(
      this.productChartItems().map((product) => product.fullName),
      this.productChartItems().map((product) => product.units),
      'Unidades vendidas',
      false,
      true,
    ),
  );
  readonly categoriesOption = computed<EChartsOption>(() =>
    this.barOption(
      this.categoryChartItems().map((category) => category.fullName),
      this.categoryChartItems().map((category) => category.units),
      'Unidades vendidas',
      false,
      true,
      undefined,
      'categories',
    ),
  );
  readonly statusOption = computed<EChartsOption>(() => {
    const total = this.data()?.orders ?? 0;
    return {
      ...this.chartBase(),
      tooltip: chartTooltipOptions(
        (value, percent) => `${value} (${percent ?? 0}%)`,
        undefined,
        'item',
      ),
      title: {
        text: String(total),
        subtext: total === 1 ? 'pedido' : 'pedidos',
        left: 'center',
        top: '34%',
        itemGap: 4,
        textStyle: {
          fontFamily: 'Montserrat',
          color: '#243127',
          fontSize: 28,
          fontWeight: 700,
        },
        subtextStyle: {
          fontFamily: 'Montserrat',
          color: '#66705f',
          fontSize: 13,
        },
      },
      legend: {
        bottom: 0,
        orient: 'horizontal',
        left: 'center',
        icon: 'circle',
        itemWidth: 9,
        itemHeight: 9,
        itemStyle: { borderWidth: 0 },
        inactiveBorderWidth: 0,
        itemGap: 12,
        textStyle: {
          fontFamily: 'Montserrat',
          color: '#3d4836',
          fontSize: 13.7,
        },
      },
      series: [
        {
          name: 'Pedidos',
          type: 'pie',
          radius: ['42%', '70%'],
          center: ['50%', '45%'],
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fffdf9',
            borderWidth: 4,
          },
          emphasis: { scaleSize: 3 },
          data: this.statusSegments()
            .filter((segment) => segment.value > 0)
            .map((segment) => ({
              name: segment.name,
              value: segment.value,
              itemStyle: { color: segment.color },
            })),
        },
      ],
    };
  });
  private chartBase(): EChartsOption {
    return {
      animationDuration: 300,
      animationDurationUpdate: 200,
      textStyle: { fontFamily: 'Montserrat', color: '#3d4836', fontSize: 14 },
      aria: { enabled: true },
    };
  }
  private temporalData(field: 'revenueCents' | 'orders' | 'customers'): {
    labels: string[];
    fullLabels: string[];
    values: number[];
  } {
    const dashboard = this.data();
    const series: DashboardPoint[] = dashboard?.series ?? [];
    const group = dashboard?.period.group ?? 'day';
    const timezone = dashboard?.period.timezone ?? 'America/Sao_Paulo';
    return {
      labels: series.map(({ bucket }) =>
        bucketLabel(bucket, group, false, timezone),
      ),
      fullLabels: series.map(({ bucket }) =>
        bucketLabel(bucket, group, true, timezone),
      ),
      values: series.map((point) => point[field]),
    };
  }
  private barOption(
    labels: string[],
    values: number[],
    name: string,
    money = false,
    ranking = false,
    tooltipLabels = labels,
    variant: 'categories' | undefined = undefined,
  ): EChartsOption {
    return {
      ...this.chartBase(),
      tooltip: chartTooltipOptions(
        (value) => (money ? this.currency.format(value) : String(value)),
        (index, label) => tooltipLabels[index] ?? label,
        ranking ? 'item' : 'axis',
      ),
      media: ranking
        ? [
            {
              query: { maxWidth: 440 },
              option: { yAxis: { axisLabel: { width: 100 } } },
            },
            {
              query: { minWidth: 441 },
              option: { yAxis: { axisLabel: { width: 130 } } },
            },
          ]
        : [
            {
              query: { maxWidth: 500 },
              option: {
                xAxis: {
                  axisLabel: { interval: dateLabelInterval(labels.length, 3) },
                },
              },
            },
            {
              query: { minWidth: 501, maxWidth: 900 },
              option: {
                xAxis: {
                  axisLabel: { interval: dateLabelInterval(labels.length, 5) },
                },
              },
            },
            {
              query: { minWidth: 901 },
              option: {
                xAxis: {
                  axisLabel: { interval: dateLabelInterval(labels.length, 7) },
                },
              },
            },
          ],
      grid: {
        left: 4,
        right: ranking ? 26 : 12,
        top: ranking ? 12 : 20,
        bottom: 10,
        containLabel: true,
      },
      xAxis: ranking
        ? {
            type: 'value',
            min: 0,
            minInterval: 1,
            splitNumber: 3,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { type: 'dashed', color: '#e9e8df' } },
          }
        : {
            type: 'category',
            data: labels,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              interval: dateLabelInterval(labels.length),
              rotate: 0,
              hideOverlap: true,
              showMaxLabel: true,
              margin: 12,
              fontSize: 11,
            },
          },
      yAxis: ranking
        ? {
            type: 'category',
            data: labels,
            inverse: true,
            axisLabel: {
              width: 130,
              overflow: 'truncate',
              margin: 10,
              fontSize: 12,
            },
            axisLine: { show: false },
            axisTick: { show: false },
          }
        : {
            type: 'value',
            min: 0,
            minInterval: money ? undefined : 1,
            splitNumber: 3,
            axisLabel: {
              fontSize: 11,
              formatter: (value: number) =>
                money ? this.currency.format(value) : String(value),
            },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { type: 'dashed', color: '#e9e8df' } },
          },
      series: [
        {
          name,
          type: 'bar',
          data: values,
          barMaxWidth: ranking ? 22 : 28,
          label: { show: false },
          emphasis: { label: { show: false } },
          itemStyle: {
            borderRadius: ranking ? [0, 8, 8, 0] : [8, 8, 0, 0],
            color:
              variant === 'categories'
                ? '#315443'
                : money
                  ? {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: '#A8C66C' },
                        { offset: 1, color: '#667255' },
                      ],
                    }
                  : ranking
                    ? {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 1,
                        y2: 0,
                        colorStops: [
                          { offset: 0, color: '#a6bc86' },
                          { offset: 1, color: '#698258' },
                        ],
                      }
                    : name === 'Pedidos'
                      ? '#536b45'
                      : '#90a589',
          },
        },
      ],
    };
  }
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
