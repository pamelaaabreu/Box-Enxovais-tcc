import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ExperienceReviewsComponent } from './experience-reviews.component';
import { CustomAlertService } from '../../core/services/custom-alert.service';
describe('ExperienceReviewsComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ExperienceReviewsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CustomAlertService,
          useValue: { success: () => {}, error: () => {} },
        },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('cancels old reads and renders a real empty response', () => {
    const f = TestBed.createComponent(ExperienceReviewsComponent),
      http = TestBed.inject(HttpTestingController);
    const old = http.expectOne(
      'http://localhost:8080/admin/experience-reviews',
    );
    f.componentInstance.load();
    expect(old.cancelled).toBeTrue();
    http.expectOne('http://localhost:8080/admin/experience-reviews').flush([]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Nenhuma avaliação recebida');
    f.componentInstance.load();
    const pending = http.expectOne(
      'http://localhost:8080/admin/experience-reviews',
    );
    f.destroy();
    expect(pending.cancelled).toBeTrue();
  });
});
