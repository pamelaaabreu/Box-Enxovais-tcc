import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminPageHeaderComponent } from './admin-page-header.component';

describe('AdminPageHeaderComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [AdminPageHeaderComponent], providers: [provideRouter([])] }));
  it('keeps the breadcrumb outside the header and renders contextual Material icons', () => {
    const fixture = TestBed.createComponent(AdminPageHeaderComponent);
    fixture.componentRef.setInput('title', 'Categorias');
    fixture.componentRef.setInput('icon', 'category');
    fixture.componentRef.setInput('breadcrumb', [{label: 'Cadastros', url: '/admin/products/manage'}, {label: 'Categorias'}]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('header nav')).toBeNull();
    expect(host.querySelector('nav a')?.getAttribute('href')).toBe('/admin/products/manage');
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Categorias');
    expect(host.querySelector('mat-icon')?.getAttribute('fontSet')).toBe('material-icons');
    expect(host.querySelector('mat-icon')?.textContent?.trim()).toBe('category');
    expect(host.querySelectorAll('h1').length).toBe(1);
  });
  it('emits its contextual action once and respects disabled state', () => {
    const fixture = TestBed.createComponent(AdminPageHeaderComponent);
    fixture.componentRef.setInput('title', 'Faixas de CEP');
    fixture.componentRef.setInput('actionLabel', 'Nova faixa');
    const action = spyOn(fixture.componentInstance.action, 'emit');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    expect(action).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('actionDisabled', true);
    fixture.detectChanges();
    button.click();
    expect(action).toHaveBeenCalledTimes(1);
  });
  it('renders route actions as links without a duplicate button', () => {
    const fixture = TestBed.createComponent(AdminPageHeaderComponent);
    fixture.componentRef.setInput('title', 'Produtos');
    fixture.componentRef.setInput('actionLabel', '+ Novo produto');
    fixture.componentRef.setInput('actionLink', '/admin/products/manage');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.primary-action')?.getAttribute('href')).toBe('/admin/products/manage');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
  it('omits isolated first-level labels and restores hierarchical navigation', () => {
    const fixture = TestBed.createComponent(AdminPageHeaderComponent);
    for (const title of ['Dashboard', 'Produtos', 'Promoções']) {
      fixture.componentRef.setInput('title', title);
      fixture.componentRef.setInput('breadcrumb', [{label: title}]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nav')).toBeNull();
      expect(fixture.nativeElement.querySelector('h1').textContent).toBe(title);
    }
    fixture.componentRef.setInput('breadcrumb', [{label: 'Promoções', url: '/admin/promotions'}, {label: 'Natal'}]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav a').getAttribute('href')).toBe('/admin/promotions');
  });
  it('keeps the desktop band compact and leaves no empty action area', () => {
    const fixture = TestBed.createComponent(AdminPageHeaderComponent);
    fixture.componentRef.setInput('title', 'Dashboard');
    fixture.componentRef.setInput('description', 'Visão geral de pedidos, catálogo e estoque.');
    fixture.nativeElement.style.width = '900px';
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('header') as HTMLElement;
    expect(header.getBoundingClientRect().height).toBeLessThanOrEqual(96);
    expect(getComputedStyle(fixture.nativeElement.querySelector('.actions')).display).toBe('none');
    expect(getComputedStyle(header).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });
});
