import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { init, use, EChartsType, EChartsCoreOption } from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, AriaComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, AriaComponent, CanvasRenderer]);
@Component({selector: 'app-chart', standalone: true, templateUrl: './chart.component.html', styleUrl: './chart.component.scss'})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() options: EChartsCoreOption = {};
  @Input() description = '';
  @Input() loading = false;
  @Input() height = 210;
  @ViewChild('canvas', {static: true}) canvas!: ElementRef<HTMLDivElement>;
  private chart?: EChartsType;
  private observer?: ResizeObserver;
  ngAfterViewInit() {
    this.chart = init(this.canvas.nativeElement);
    this.render();
    this.observer = new ResizeObserver(() => this.chart?.resize());
    this.observer.observe(this.canvas.nativeElement);
  }
  ngOnChanges() { this.render(); }
  private render() {
    if (!this.chart) return;
    this.chart.setOption(this.options, {notMerge: true});
    if (this.loading) this.chart.showLoading(); else this.chart.hideLoading();
  }
  ngOnDestroy() { this.observer?.disconnect(); this.chart?.dispose(); }
}
