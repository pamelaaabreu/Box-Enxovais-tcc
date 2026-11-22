import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { EChartsCoreOption } from 'echarts/core';
import { ChartComponent } from '../../../../../shared/components/chart/chart.component';
import {
  chartGridLine,
  chartText,
  chartTooltip,
} from '../../../../../shared/components/chart/chart-options';
import { DashboardPoint } from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard-trend',
  standalone: true,
  imports: [CurrencyPipe, ChartComponent],
  templateUrl: './dashboard-trend.component.html',
  styleUrl: './dashboard-trend.component.scss',
})
export class DashboardTrendComponent {
  readonly title = input.required<string>();
  readonly series = input.required<DashboardPoint[]>();
  readonly field = input.required<'revenueCents' | 'orders' | 'customers'>();

  readonly values = computed(() =>
    this.series().map((point) => point[this.field()]),
  );

  readonly activeBuckets = computed(
    () => this.values().filter((value) => value > 0).length,
  );

  readonly total = computed(() =>
    this.values().reduce((total, value) => total + value, 0),
  );

  readonly options = computed<EChartsCoreOption>(() => ({
    animation: false,
    textStyle: { ...chartText, fontSize: 12, color: '#465545' },
    color: ['#667a50'],
    tooltip: {
      ...chartTooltip,
      valueFormatter: (value: unknown) => this.format(Number(value)),
    },
    grid: {
      left: 7,
      right: 12,
      top: 13,
      bottom: 5,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    xAxis: {
      type: 'category',
      data: this.series().map((point) => this.label(point.bucket)),
      axisLabel: {
        ...chartText,
        fontSize: 12,
        color: '#465545',
        hideOverlap: true,
        interval: Math.max(0, Math.ceil(this.series().length / 8) - 1),
        formatter: (value: string) =>
          value.length === 7
            ? `${value.slice(0, 2)}/${value.slice(-2)}`
            : value.slice(0, 5),
      },
      axisTick: { show: false },
      axisLine: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      min: 0,
      minInterval: this.field() === 'revenueCents' ? undefined : 1,
      splitNumber: 3,
      splitLine: chartGridLine,
      axisLabel: {
        ...chartText,
        fontSize: 12,
        color: '#465545',
        formatter: (value: number) => this.format(value),
      },
    },
    series: [
      {
        name: this.title(),
        type: 'line',
        smooth: 0.2,
        data: this.values().map((value) =>
          this.field() === 'revenueCents' ? value / 100 : value,
        ),
        showSymbol: this.series().length <= 12,
        symbolSize: 6,
        lineStyle: { width: 2.5, color: '#657a4f' },
        areaStyle: { color: 'rgba(106, 128, 82, 0.13)' },
        itemStyle: { color: '#5e764b', borderColor: '#fffdf9', borderWidth: 1 },
      },
    ],
  }));

  format(value: number): string {
    return this.field() === 'revenueCents'
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          maximumFractionDigits: 2,
        }).format(value)
      : String(value);
  }

  label(value: string): string {
    const [year, month, day] = value.split('-');
    return day ? `${day}/${month}/${year}` : `${month}/${year}`;
  }
}
