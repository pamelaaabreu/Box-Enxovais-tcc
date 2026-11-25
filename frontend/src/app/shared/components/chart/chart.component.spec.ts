import { TestBed } from '@angular/core/testing';
import { getInstanceByDom } from 'echarts/core';
import { ChartComponent } from './chart.component';
describe('ChartComponent', () => {
  it('updates one instance and releases the chart and observer on destruction', () => {
    const fixture = TestBed.createComponent(ChartComponent);
    fixture.componentRef.setInput('options', {
      xAxis: { type: 'category', data: ['A'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: [0] }],
    });
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('[role=img]');
    const instance = getInstanceByDom(element);
    expect(instance).toBeTruthy();
    fixture.componentRef.setInput('options', {
      xAxis: { type: 'category', data: ['A'] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: [2] }],
    });
    fixture.detectChanges();
    expect(getInstanceByDom(element)).toBe(instance);
    const disconnected = spyOn(
      ResizeObserver.prototype,
      'disconnect',
    ).and.callThrough();
    fixture.destroy();
    expect(getInstanceByDom(element)).toBeUndefined();
    expect(disconnected).toHaveBeenCalled();
  });
});
