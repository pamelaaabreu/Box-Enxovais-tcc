import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminStateComponent } from './admin-state.component';

describe('AdminStateComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [AdminStateComponent], providers: [provideRouter([])] }));
  it('preserves an error and emits retry without submitting', () => {
    const fixture = TestBed.createComponent(AdminStateComponent);
    fixture.componentRef.setInput('kind', 'error');
    fixture.componentRef.setInput('title', 'Falha de comunicação');
    fixture.componentRef.setInput('description', 'Tente novamente.');
    fixture.componentRef.setInput('actionLabel', 'Recarregar');
    const retry = spyOn(fixture.componentInstance.action, 'emit');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Tente novamente.');
    const button = fixture.nativeElement.querySelector('button');
    expect(button.type).toBe('button');
    button.click();
    expect(retry).toHaveBeenCalledTimes(1);
  });
  it('announces loading without an unnecessary action', () => {
    const fixture = TestBed.createComponent(AdminStateComponent);
    fixture.componentRef.setInput('kind', 'loading');
    fixture.componentRef.setInput('title', 'Carregando…');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button, a')).toBeNull();
  });
  it('renders empty navigation using the existing router', () => {
    const fixture = TestBed.createComponent(AdminStateComponent);
    fixture.componentRef.setInput('title', 'Nenhum produto');
    fixture.componentRef.setInput('actionLabel', 'Cadastrar');
    fixture.componentRef.setInput('actionLink', '/admin/products/manage');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/admin/products/manage');
    expect(fixture.nativeElement.querySelector('mat-icon').textContent).toContain('search_off');
  });
});
