import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { LabelLayout, LegacyGridContainLabel } from 'echarts/features';

echarts.use([
  BarChart,
  PieChart,
  AriaComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
  LegacyGridContainLabel,
  LabelLayout,
]);

@Component({
  selector: 'app-echart',
  standalone: true,
  templateUrl: './echart.component.html',
  styleUrl: './echart.component.scss',
})
export class EchartComponent {
  readonly option = input.required<EChartsOption>();
  readonly height = input(280);
  readonly ariaLabel = input('Gráfico');
  private readonly host =
    viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly destroy = inject(DestroyRef);
  private chart?: echarts.EChartsType;
  private disposed = false;
  private observer?: ResizeObserver;
  private motion?: MediaQueryList;
  private readonly motionChanged = () => this.render(this.option());

  constructor() {
    effect(() => {
      const option = this.option();
      this.render(option);
    });
    afterNextRender(() => {
      if (this.chart || this.disposed) return;
      this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.motion.addEventListener('change', this.motionChanged);
      this.chart = echarts.init(this.host().nativeElement);
      this.render(this.option());
      this.observer = new ResizeObserver(() => this.chart?.resize());
      this.observer.observe(this.host().nativeElement);
      void document.fonts.ready.then(() => this.chart?.resize());
    });
    this.destroy.onDestroy(() => {
      this.disposed = true;
      this.observer?.disconnect();
      this.motion?.removeEventListener('change', this.motionChanged);
      this.chart?.dispose();
      this.chart = undefined;
    });
  }

  private render(option: EChartsOption): void {
    this.chart?.setOption(
      this.motion?.matches
        ? {
            ...option,
            animation: false,
            animationDuration: 0,
            animationDurationUpdate: 0,
          }
        : option,
      true,
    );
  }
}
