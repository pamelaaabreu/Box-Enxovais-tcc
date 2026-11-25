import { reflectComponentType, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { adminRoutes } from './admin.routes';
import { CreatePromotionComponent } from './promotions/promotion-manager/create-promotion.component';
import { routes } from '../../app.routes';

describe('Promotion management routes', () => {
  it('keeps one manager and form with legacy redirects and unsaved-change guards', () => {
    TestBed.configureTestingModule({ providers: [provideRouter(adminRoutes)] });
    const children =
      TestBed.inject(Router)
        .config.find((route) => route.children)
        ?.children?.find((route) => route.path === 'promocoes')?.children ?? [];
    expect(
      children.find((route) => route.path === '')?.data?.['listing'],
    ).toBeTrue();
    for (const path of ['nova', ':id/editar']) {
      expect(children.find((route) => route.path === path)?.component).toBe(
        CreatePromotionComponent,
      );
      expect(
        children.find((route) => route.path === path)?.canDeactivate?.length,
      ).toBe(1);
    }
    expect(
      children.find((route) => route.path === ':id')?.data?.['readonly'],
    ).toBeTrue();
    expect(children.find((route) => route.path === 'create')?.redirectTo).toBe(
      'nova',
    );
    expect(
      children.find((route) => route.path === 'add-product')?.redirectTo,
    ).toBe('');
  });
  it('redirects the old standalone registration and participant URLs into the administrative module', () => {
    expect(
      routes.find((route) => route.path === 'promotion-register')?.redirectTo,
    ).toBe('admin/promocoes/nova');
    expect(
      routes.find((route) => route.path === 'add-to-promotion')?.redirectTo,
    ).toBe('admin/promocoes');
  });
  it('redirects standalone legacy product screens into the guarded manager', () => {
    expect(
      routes.find((route) => route.path === 'product-register')?.redirectTo,
    ).toBe('admin/produtos/novo');
    expect(
      routes.find((route) => route.path === 'image-upload/:id')?.redirectTo,
    ).toBe('admin/produtos/:id/imagens');
  });
  it('redirects the redundant metrics address to the existing dashboard', () => {
    TestBed.configureTestingModule({ providers: [provideRouter(adminRoutes)] });
    const children =
      TestBed.inject(Router).config.find((route) => route.children)?.children ??
      [];
    expect(children.find((route) => route.path === 'metrics')?.redirectTo).toBe(
      'dashboard',
    );
    expect(children.find((route) => route.path === 'metrics')?.pathMatch).toBe(
      'full',
    );
    expect(
      children.find((route) => route.path === 'dashboard')?.component,
    ).toBeDefined();
  });

  it('resolves the reorganized lazy components without changing their route addresses', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(adminRoutes)] });
    const children =
      TestBed.inject(Router).config.find((route) => route.children)?.children ??
      [];
    const expected: Record<string, string> = {
      pedidos: 'app-admin-orders',
      'pedidos/:id': 'app-admin-order-detail',
      clientes: 'app-admin-customers',
      'clientes/:id': 'app-admin-customer-detail',
      avaliacoes: 'app-experience-reviews',
    };
    for (const [path, selector] of Object.entries(expected)) {
      const route = children.find((route) => route.path === path);
      expect(route?.loadComponent).withContext(path).toBeDefined();
      const component = await route!.loadComponent!();
      expect(reflectComponentType(component as Type<unknown>)?.selector)
        .withContext(path)
        .toBe(selector);
    }
    const registrations =
      children.find((route) => route.path === 'cadastros')?.children ?? [];
    const shipping = await registrations.find(
      (route) => route.path === 'faixas-cep',
    )!.loadComponent!();
    expect(reflectComponentType(shipping as Type<unknown>)?.selector).toBe(
      'app-shipping-ranges',
    );
    for (const path of ['categorias', 'marcas']) {
      expect(
        reflectComponentType(
          registrations.find((route) => route.path === path)!.component!,
        )?.selector,
      ).toBe('app-catalog-registration');
    }
    const products =
      children.find((route) => route.path === 'produtos')?.children ?? [];
    expect(
      reflectComponentType(
        products.find((route) => route.path === ':id/variacoes')!.component!,
      )?.selector,
    ).toBe('app-product-variants-page');
    expect(
      products.find((route) => route.path === ':id/editar')?.canDeactivate
        ?.length,
    ).toBe(1);
  });
});
