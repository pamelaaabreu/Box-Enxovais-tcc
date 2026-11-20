import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AuthService } from '../../../core/services/auth.service';

describe('Administrative page headers', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [AdminComponent], providers: [provideRouter([]), { provide: AuthService, useValue: { getUserName: () => 'Administrador', getUserEmail: () => 'admin@example.test', logout: () => {} } }] }));
  function render(url: string) {
    spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue(url);
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }
  it('removes the shared title and search only from Promotions while keeping mobile menu access', () => {
    const host = render('/admin/promotions/new');
    expect(host.querySelector('.admin-header')).toBeNull();
    expect(host.querySelector('.admin-search')).toBeNull();
    expect(host.querySelector('.promotions-menu-toggle')).not.toBeNull();
    expect(host.querySelector('app-admin-page-header')).toBeNull();
  });
  it('lets product listings own their header and keeps generic search removed', () => {
    const host = render('/admin/products');
    expect(host.querySelector('app-admin-page-header')).toBeNull();
    expect(host.querySelector('.admin-search')).toBeNull();
    expect(host.querySelector('.promotions-menu-toggle')).not.toBeNull();
  });
  it('uses a compact shared header with breadcrumb when creating a product', () => {
    const host = render('/admin/products/manage');
    expect(host.querySelector('app-admin-page-header h1')?.textContent).toBe('Cadastrar produto');
    expect(host.querySelector('app-admin-page-header header.compact')).not.toBeNull();
    expect(host.querySelector('app-admin-page-header nav a')?.getAttribute('href')).toBe('/admin/catalog/categories');
    expect(host.querySelector('.admin-search')).toBeNull();
  });
  it('preserves native disclosure controls and active route semantics', () => {
    const host = render('/admin/catalog/categories');
    const summary = host.querySelectorAll('summary')[1];
    expect(summary.parentElement?.hasAttribute('open')).toBeTrue();
    expect(host.querySelector('nav a[routerlink="/admin/catalog/categories"]')).not.toBeNull();
    expect(host.querySelector('app-admin-page-header')).toBeNull();
  });
});
