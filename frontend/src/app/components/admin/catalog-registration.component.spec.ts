import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { CustomAlertService } from '../../core/services/custom-alert.service';
import { CatalogRegistrationComponent } from './catalog-registration.component';

describe('CatalogRegistrationComponent', () => {
  const url = 'http://localhost:8080/admin/catalog/categories';
  beforeEach(() => TestBed.configureTestingModule({
    imports: [CatalogRegistrationComponent],
    providers: [
      provideHttpClient(), provideHttpClientTesting(),
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
});