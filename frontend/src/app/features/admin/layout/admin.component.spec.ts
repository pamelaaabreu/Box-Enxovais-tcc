import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AuthService } from '../../../core/services/auth.service';

describe('Administrative page headers', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideRouter([]),
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: false }) },
        },
        {
          provide: AuthService,
          useValue: {
            getUserName: () => 'Administrador',
            getUserEmail: () => 'admin@example.test',
            logout: () => {},
          },
        },
      ],
    }),
  );
  function render(url: string) {
    spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue(url);
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }
  it('removes the shared title and search only from Promotions while keeping mobile menu access', () => {
    const host = render('/admin/promocoes/nova');
    expect(host.querySelector('.admin-header')).toBeNull();
    expect(host.querySelector('.admin-search')).toBeNull();
    expect(host.querySelector('.promotions-menu-toggle')).toBeNull();
    expect(host.querySelector('app-admin-page-header')).toBeNull();
  });
  it('lets product listings own their header and keeps generic search removed', () => {
    const host = render('/admin/produtos');
    expect(host.querySelector('app-admin-page-header')).toBeNull();
    expect(host.querySelector('.admin-search')).toBeNull();
    expect(host.querySelector('.promotions-menu-toggle')).toBeNull();
  });
  it('lets the product editor own its header without duplicating it in the shell', () => {
    const host = render('/admin/produtos/novo');
    expect(host.querySelector('app-admin-page-header')).toBeNull();
    expect(host.querySelector('router-outlet')).not.toBeNull();
    expect(host.querySelector('.admin-search')).toBeNull();
  });
  it('links Products directly to its listing without a duplicate creation submenu', () => {
    const host = render('/admin/produtos/novo');
    expect(
      host.querySelector('nav > a[routerlink="/admin/produtos"]'),
    ).not.toBeNull();
    expect(
      host.querySelector('nav a[routerlink="/admin/produtos/novo"]'),
    ).toBeNull();
    expect(host.querySelectorAll('summary').length).toBe(1);
    expect(host.querySelector('summary')?.textContent).toContain('Cadastros');
    expect(host.querySelector('nav')?.textContent).not.toContain('Listagem');
  });
  it('keeps Reports enabled with its required shared header', () => {
    const host = render('/admin/relatorios');
    expect(host.querySelector('h1')?.textContent).toBe('Relatórios');
    expect(host.textContent).toContain(
      'Consulte e analise os resultados da loja por período.',
    );
    expect(host.querySelector('a[href="/admin/relatorios"]')).not.toBeNull();
    expect(host.querySelectorAll('app-admin-page-header').length).toBe(1);
  });
  it('preserves native disclosure controls and active route semantics', () => {
    const host = render('/admin/cadastros/categorias');
    const summary = host.querySelector('summary');
    expect(summary?.parentElement?.hasAttribute('open')).toBeTrue();
    expect(
      host.querySelector('nav a[routerlink="/admin/cadastros/categorias"]'),
    ).not.toBeNull();
    expect(host.querySelector('app-admin-page-header')).toBeNull();
  });
  it('opens a mobile dialog with a close control and removes hidden navigation', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.componentInstance.mobile.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#admin-sidebar')).toBeNull();
    const trigger = fixture.nativeElement.querySelector(
      'button[aria-label="Abrir menu"]',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[role="dialog"][aria-modal="true"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('main').hasAttribute('inert'),
    ).toBeTrue();
    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Fechar menu"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#admin-sidebar')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('main').hasAttribute('inert'),
    ).toBeFalse();
  });
});
