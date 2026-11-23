import { Component, computed, input } from '@angular/core';
import { ChartComponent } from './chart.component';
import { EChartsCoreOption } from 'echarts/core';
import { chartText, chartTooltip, chartGridLine } from './chart-options';
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [ChartComponent],
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.scss',
})
export class BarChartComponent {
  readonly title = input.required<string>();
  readonly unit = input('unidades');
  readonly values = input.required<{ name: string; value: number }[]>();
  readonly height = computed(() =>
    Math.max(
      140,
      this.values().length *
        Math.max(
          60,
          ...this.values().map((v) => Math.ceil(v.name.length / 16) * 17 + 12),
        ) +
        32,
    ),
  );
  readonly total = computed(() =>
    this.values().reduce((sum, item) => sum + item.value, 0),
  );
  readonly options = computed<EChartsCoreOption>(() => ({
    animation: false,
    color: ['#556b45'],
    textStyle: chartText,
    tooltip: { ...chartTooltip, axisPointer: { type: 'shadow' } },
    grid: {
      left: 8,
      right: 24,
      top: 8,
      bottom: 8,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitNumber: 3,
      axisLabel: chartText,
      splitLine: chartGridLine,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: this.values().map((v) => v.name),
      axisLabel: {
        ...chartText,
        width: 130,
        overflow: 'break',
        lineHeight: 17,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: this.title(),
        type: 'bar',
        data: this.values().map((v) => v.value),
        barMaxWidth: 16,
        label: { show: true, position: 'right', ...chartText },
        itemStyle: { borderRadius: [0, 4, 4, 0] },
      },
    ],
  }));
}
