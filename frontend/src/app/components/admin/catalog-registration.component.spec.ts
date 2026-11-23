import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { CustomAlertService } from '../../core/services/custom-alert.service';
import { CatalogRegistrationComponent } from './catalog-registration.component';

describe('CatalogRegistrationComponent', () => {
  const url = 'http://localhost:8080/admin/catalog/categories';
  beforeEach(() => TestBed.configureTestingModule({
    imports: [CatalogRegistrationComponent],
    providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { kind: 'categories' } } } },
      { provide: CustomAlertService, useValue: { success: jasmine.createSpy() } },
    ],
  }));

  it('recovers from a failed list, preserves the editor on conflict and refreshes after saving', () => {
    const page = TestBed.createComponent(CatalogRegistrationComponent).componentInstance;
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush({}, { status: 500, statusText: 'Falha' });
    expect(page.failed()).toBeTrue();
    page.load();
    http.expectOne(url).flush([]);
    expect(page.filtered()).toEqual([]);
    page.start();
    page.name = '  Casa   Bela ';
    page.save();
    const failed = http.expectOne(url);
    expect(failed.request.body).toEqual({ name: 'Casa Bela' });
    failed.flush({ message: 'Nome duplicado' }, { status: 409, statusText: 'Conflito' });
    expect(page.formError()).toBe('Nome duplicado');
    expect(page.editing()).toBeTrue();
    page.save();
    http.expectOne(url).flush({ id: 8 });
    http.expectOne(url).flush([{ id: 8, name: 'Casa Bela', productCount: 0 }]);
    page.query.set('BELA');
    expect(page.filtered().length).toBe(1);
    page.query.set('Ausente');
    expect(page.filtered()).toEqual([]);
    http.verify();
  });
  it('uses one shared category header and opens the existing editor from its CTA', () => {
    const fixture = TestBed.createComponent(CatalogRegistrationComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush([]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('h1').length).toBe(1);
    expect(host.querySelector('.registration-heading')).toBeNull();
    host.querySelector<HTMLButtonElement>('app-admin-page-header button.primary-action')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.editing()).toBeTrue();
    expect(host.querySelector('form.editor')).not.toBeNull();
    http.verify();
  });
  it('paginates locally and clamps the current page after filtering', () => {
    const fixture = TestBed.createComponent(CatalogRegistrationComponent);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush(Array.from({length: 23}, (_, index) => ({id: index + 1, name: 'Categoria ' + (index + 1), productCount: 0})));
    const component = fixture.componentInstance;
    expect(component.paged().length).toBe(10);
    component.page.set(3);
    expect(component.paged().map(item => item.id)).toEqual([21, 22, 23]);
    component.query.set('Categoria 23');
    expect(component.currentPage()).toBe(1);
    expect(component.paged()[0].id).toBe(23);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-pagination')).not.toBeNull();
    http.verify();
  });

});