import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AdminRoutingModule } from './admin-routing.module';
import { CreatePromotionComponent } from '../../features/create-promotion/create-promotion.component';
import { routes } from '../../app.routes';

describe('Promotion management routes', () => {
  it('keeps one manager and form with legacy redirects and unsaved-change guards', () => {
    TestBed.configureTestingModule({ imports: [AdminRoutingModule], providers: [provideRouter([])] });
    const children = TestBed.inject(Router).config.find(route => route.children)?.children?.find(route => route.path === 'promotions')?.children ?? [];
    expect(children.find(route => route.path === '')?.data?.['listing']).toBeTrue();
    for (const path of ['new', ':id/edit']) {
      expect(children.find(route => route.path === path)?.component).toBe(CreatePromotionComponent);
      expect(children.find(route => route.path === path)?.canDeactivate?.length).toBe(1);
    }
    expect(children.find(route => route.path === ':id')?.data?.['readonly']).toBeTrue();
    expect(children.find(route => route.path === 'create')?.redirectTo).toBe('new');
    expect(children.find(route => route.path === 'add-product')?.redirectTo).toBe('');
  });
  it('redirects the old standalone registration and participant URLs into the administrative module', () => {
    expect(routes.find(route => route.path === 'promotion-register')?.redirectTo).toBe('admin/promotions/new');
    expect(routes.find(route => route.path === 'add-to-promotion')?.redirectTo).toBe('admin/promotions');
  });
  it('redirects the redundant metrics address to the existing dashboard', () => {
    TestBed.configureTestingModule({imports: [AdminRoutingModule], providers: [provideRouter([])]});
    const children = TestBed.inject(Router).config.find(route => route.children)?.children ?? [];
    expect(children.find(route => route.path === 'metrics')?.redirectTo).toBe('dashboard');
    expect(children.find(route => route.path === 'metrics')?.pathMatch).toBe('full');
    expect(children.find(route => route.path === 'dashboard')?.component).toBeDefined();
  });

});
