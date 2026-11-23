import { TestBed } from '@angular/core/testing';
import type { EChartsOption } from 'echarts';
import { getInstanceByDom } from 'echarts/core';
import { EchartComponent } from './echart.component';

describe('EchartComponent', () => {
  const option = (value: number): EChartsOption => ({
    animation: false, xAxis: { type: 'category', data: ['A'] },
    yAxis: { type: 'value' }, series: [{ type: 'bar', data: [value] }],
  });

  it('renders after initialization, updates a single instance and releases resources', async () => {
    const fixture = TestBed.createComponent(EchartComponent);
    fixture.nativeElement.style.width = '400px';
    fixture.componentRef.setInput('option', option(1));
    fixture.componentRef.setInput('ariaLabel', 'Pedidos no período');
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement.querySelector('[role="img"]') as HTMLDivElement;
    const chart = getInstanceByDom(host);
    expect(chart).toBeDefined();
    expect(host.getAttribute('aria-label')).toBe('Pedidos no período');
    expect(host.style.height).toBe('280px');
    const update = spyOn(chart!, 'setOption').and.callThrough();
    fixture.componentRef.setInput('option', option(2));
    fixture.componentRef.setInput('height', 240);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(getInstanceByDom(host)).toBe(chart);
    expect(update).toHaveBeenCalled();
    expect(update.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ series: [{ type: 'bar', data: [2] }] }));
    expect((update.calls.mostRecent().args as readonly unknown[])[1]).toBeTrue();
    expect(host.style.height).toBe('240px');
    const disconnected = spyOn(ResizeObserver.prototype, 'disconnect').and.callThrough();
    fixture.destroy();
    expect(disconnected).toHaveBeenCalled();
    expect(getInstanceByDom(host)).toBeUndefined();
  });

  it('disables animation when reduced motion is requested', async () => {
    const media = jasmine.createSpyObj<MediaQueryList>('motion', ['addEventListener', 'removeEventListener'], { matches: true });
    spyOn(window, 'matchMedia').and.returnValue(media);
    const fixture = TestBed.createComponent(EchartComponent);
    fixture.nativeElement.style.width = '400px';
    fixture.componentRef.setInput('option', { ...option(1), animation: true });
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement.querySelector('[role="img"]') as HTMLDivElement;
    expect(getInstanceByDom(host)?.getOption()['animation']).toBeFalse();
    fixture.destroy();
    expect(media.removeEventListener).toHaveBeenCalled();
  });
});
