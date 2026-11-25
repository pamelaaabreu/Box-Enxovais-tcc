import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { CustomAlertService } from '../../../../core/services/custom-alert.service';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { ProductComponent } from './product.component';
import { ProductService } from '../../../../core/services/product.service';

describe('Product listing navigation', () => {
  it('restores the SKU search, highlights only the new product and preserves name filtering', () => {
    const params = new BehaviorSubject(
      convertToParamMap({ q: 'BX-EDR-098', created: '98' }),
    );
    const getPage = jasmine.createSpy().and.returnValue(
      of({
        items: [
          {
            id: 98,
            name: 'Edredom novo',
            sku: 'BX-EDR-098',
            price: 249.9,
            quantity: 3,
            status: 'active',
            image_paths: [],
          },
        ],
        pagination: { offset: 0, limit: 20, total: 1, hasMore: false },
      }),
    );
    TestBed.configureTestingModule({
      imports: [ProductComponent],
      providers: [
        provideRouter([]),
        {
          provide: ProductService,
          useValue: { getAdminProductsPage: getPage },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: params.value },
            queryParamMap: params,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(ProductComponent);
    fixture.detectChanges();
    expect(getPage.calls.mostRecent().args[0].filters['search__contains']).toBe(
      'BX-EDR-098',
    );
    expect(
      fixture.nativeElement.querySelectorAll('tr.new-product').length,
    ).toBe(1);
    expect(
      fixture.nativeElement.querySelector('tr.new-product').textContent,
    ).toContain('Recém-cadastrado');
    expect(
      fixture.nativeElement
        .querySelector('.primary-action')
        .getAttribute('href'),
    ).toBe('/admin/produtos/novo');
    fixture.componentInstance.filters.controls.name.setValue('Edredom novo');
    fixture.componentInstance.applyFilters();
    expect(getPage.calls.mostRecent().args[0].filters['search__contains']).toBe(
      'Edredom novo',
    );
    params.next(convertToParamMap({}));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tr.new-product')).toBeNull();
  });

  it('defers deletion to the shared confirmation and reports archival without dropping filters', () => {
    const params = new BehaviorSubject(convertToParamMap({}));
    const product = {
      id: 8,
      name: 'Produto com histórico',
      price: 100,
      quantity: 2,
      status: 'active',
      measurements: {},
      promotional_price: 0,
    };
    const getPage = jasmine.createSpy().and.returnValue(
      of({
        items: [product],
        pagination: { offset: 0, limit: 20, total: 1, hasMore: false },
      }),
    );
    const remove = jasmine
      .createSpy()
      .and.returnValue(of({ action: 'archived' }));
    const open = jasmine
      .createSpy()
      .and.returnValue({ afterClosed: () => of(false) });
    const success = jasmine.createSpy();
    TestBed.configureTestingModule({
      imports: [ProductComponent],
      providers: [
        provideRouter([]),
        {
          provide: ProductService,
          useValue: { getAdminProductsPage: getPage, removeProduct: remove },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: params.value },
            queryParamMap: params,
          },
        },
        { provide: ConfirmDialogService, useValue: { open } },
        { provide: CustomAlertService, useValue: { success } },
      ],
    });
    const fixture = TestBed.createComponent(ProductComponent);
    fixture.detectChanges();
    fixture.componentInstance.remove(product);
    expect(remove).not.toHaveBeenCalled();
    const config = open.calls.mostRecent().args[0];
    expect(config.message).toBe(product.name);
    expect(config.variant).toBe('danger');
    config.execute().subscribe();
    expect(remove).toHaveBeenCalledOnceWith(8);
  });
  it('keeps primary actions inline and delegates contextual deletion to confirmation', async () => {
    const params = new BehaviorSubject(convertToParamMap({}));
    const items = [
      {
        id: 8,
        name: 'Produto ativo',
        sku: 'BX-CAM-008',
        price: 100,
        quantity: 0,
        status: 'active',
        image_paths: [],
      },
      {
        id: 9,
        name: 'Produto inativo',
        price: 200,
        quantity: 2,
        status: 'inactive',
        image_paths: [],
      },
    ];
    const open = jasmine
      .createSpy()
      .and.returnValue({ afterClosed: () => of(false) });
    TestBed.configureTestingModule({
      imports: [ProductComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: ProductService,
          useValue: {
            getAdminProductsPage: () =>
              of({
                items,
                pagination: { offset: 0, limit: 20, total: 2, hasMore: false },
              }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: params.value },
            queryParamMap: params,
          },
        },
        { provide: ConfirmDialogService, useValue: { open } },
      ],
    });
    const fixture = TestBed.createComponent(ProductComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.product-actions > a').length).toBe(4);
    expect(
      host.querySelectorAll('.product-actions > .remove-product').length,
    ).toBe(0);
    const triggers = host.querySelectorAll<HTMLButtonElement>(
      '.product-menu-trigger',
    );
    triggers[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(
      overlay.querySelector('a[href="/admin/produtos/8/imagens"]'),
    ).not.toBeNull();
    expect(
      overlay.querySelector('a[href="/produto/8"]')?.getAttribute('rel'),
    ).toBe('noopener noreferrer');
    (overlay.querySelector('.remove-product') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(open.calls.mostRecent().args[0].message).toBe('Produto ativo');
    triggers[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(overlay.querySelector('button[disabled]')?.textContent).toContain(
      'Não publicado',
    );
    fixture.destroy();
  });
});
