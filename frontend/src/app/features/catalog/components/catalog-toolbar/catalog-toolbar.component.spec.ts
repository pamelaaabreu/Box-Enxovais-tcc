import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CatalogToolbarComponent } from './catalog-toolbar.component';

describe('CatalogToolbarComponent', () => {
  it('reports totals once, exposes sorting and emits the filter toggle', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(CatalogToolbarComponent);
    fixture.componentRef.setInput('total', 1);
    fixture.componentRef.setInput('showFilters', true);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[role="status"]').textContent.trim(),
    ).toBe('1 produto');
    expect(
      fixture.nativeElement
        .querySelector('mat-select')
        .getAttribute('aria-label'),
    ).toBe('Ordenar produtos');
    const toggle = spyOn(fixture.componentInstance.filtersToggle, 'emit');
    fixture.nativeElement.querySelector('.filter-toggle').click();
    expect(toggle).toHaveBeenCalled();
    fixture.componentRef.setInput('total', 0);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[role="status"]').textContent.trim(),
    ).toBe('0 produtos');
  });
});
