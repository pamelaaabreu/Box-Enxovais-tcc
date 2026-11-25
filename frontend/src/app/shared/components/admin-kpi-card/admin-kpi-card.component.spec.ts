import { TestBed } from '@angular/core/testing';
import { AdminKpiCardComponent } from './admin-kpi-card.component';

describe('AdminKpiCardComponent', () => {
  const render = () => {
    const f = TestBed.createComponent(AdminKpiCardComponent);
    f.componentRef.setInput('title', 'Indicador');
    return f;
  };
  it('formats currency, numbers and percentages without changing supplied values', () => {
    const f = render();
    f.componentRef.setInput('value', 1234.56);
    f.componentRef.setInput('format', 'currency');
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('1.234,56');
    expect(f.componentInstance.value()).toBe(1234.56);
    f.componentRef.setInput('format', 'number');
    f.componentRef.setInput('value', 1000);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('1.000');
    f.componentRef.setInput('format', 'percent');
    f.componentRef.setInput('value', 0.25);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('25%');
  });
  it('applies explicit variants and never infers a warning from zero', () => {
    const f = render();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.metric--warning')).toBeNull();
    for (const variant of ['featured', 'success', 'warning']) {
      f.componentRef.setInput('variant', variant);
      f.detectChanges();
      expect(
        f.nativeElement.querySelector('.metric--' + variant),
      ).not.toBeNull();
    }
  });
  it('shows loading feedback instead of stale values and exposes optional keyboard hints', () => {
    const f = render();
    f.componentRef.setInput('value', 150);
    f.componentRef.setInput('loading', true);
    f.componentRef.setInput('variant', 'featured');
    f.componentRef.setInput('tooltip', 'Explicação do indicador');
    f.detectChanges();
    expect(f.nativeElement.querySelector('strong')).toBeNull();
    expect(getComputedStyle(f.nativeElement.querySelector('h2')).color).toBe(
      'rgb(48, 59, 45)',
    );
    expect(
      f.nativeElement.querySelector('[role=status]').textContent,
    ).toContain('Carregando');
    expect(
      f.nativeElement.querySelector('article').getAttribute('aria-busy'),
    ).toBe('true');
    expect(f.nativeElement.querySelector('article').tabIndex).toBe(0);
  });
});
