import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { CustomAlertService } from '../../core/services/custom-alert.service';
import { API_BASE_URL } from '../../core/config/api.config';
import { NewsletterComponent } from './newsletter.component';

function setup(baseUrl = 'http://localhost:8080') {
  const alerts = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: CustomAlertService, useValue: alerts },
      { provide: API_BASE_URL, useValue: baseUrl },
    ],
  });
  const fixture = TestBed.createComponent(NewsletterComponent);
  const http = TestBed.inject(HttpTestingController);
  const resetForm = jasmine.createSpy('resetForm');
  const form = {
    valid: true,
    value: { email: ' NEWSLETTER@EXAMPLE.INVALID ' },
    resetForm,
  } as unknown as NgForm;
  return {
    fixture,
    page: fixture.componentInstance,
    http,
    alerts,
    form,
    resetForm,
  };
}

describe('NewsletterComponent', () => {
  it('normalizes email and prevents simultaneous requests', () => {
    const { page, http, alerts, form, resetForm } = setup();
    page.onSubmit(form);
    page.onSubmit(form);
    const request = http.expectOne(
      'http://localhost:8080/api/newsletter/subscribe',
    );
    expect(request.request.body).toEqual({
      email: 'newsletter@example.invalid',
    });
    request.flush({ message: 'Solicitação recebida.' });
    expect(alerts.success).toHaveBeenCalledOnceWith(
      'Solicitação recebida',
      'Se for uma nova inscrição, enviaremos a confirmação por e-mail.',
    );
    expect(page.isLoading).toBeFalse();
    expect(resetForm).toHaveBeenCalled();
    http.verify();
  });

  it('uses the same private acknowledgement for repeated subscriptions', () => {
    const { page, http, alerts, form } = setup();
    for (let index = 0; index < 2; index++) {
      page.onSubmit(form);
      http
        .expectOne('http://localhost:8080/api/newsletter/subscribe')
        .flush({ message: 'Solicitação recebida.' });
    }
    expect(alerts.success.calls.argsFor(0)).toEqual(
      alerts.success.calls.argsFor(1),
    );
    expect(JSON.stringify(alerts.success.calls.allArgs())).not.toContain(
      'já cadastrado',
    );
    http.verify();
  });

  it('keeps generic failure feedback and allows a later retry', () => {
    const { page, http, alerts, form } = setup();
    page.onSubmit(form);
    http
      .expectOne('http://localhost:8080/api/newsletter/subscribe')
      .flush(
        { message: 'internal database failure' },
        { status: 500, statusText: 'Internal Server Error' },
      );
    expect(page.isLoading).toBeFalse();
    expect(alerts.error).toHaveBeenCalled();
    expect(JSON.stringify(alerts.error.calls.allArgs())).not.toContain(
      'database',
    );
    page.onSubmit(form);
    http
      .expectOne('http://localhost:8080/api/newsletter/subscribe')
      .flush({ message: 'Solicitação recebida.' });
    http.verify();
  });

  it('uses configurable API base and cancels on destruction', () => {
    const { fixture, page, http, form } = setup(
      'https://api.example.invalid/backend/',
    );
    page.onSubmit(form);
    const request = http.expectOne(
      'https://api.example.invalid/backend/api/newsletter/subscribe',
    );
    fixture.destroy();
    expect(request.cancelled).toBeTrue();
    expect(page.isLoading).toBeFalse();
    http.verify();
  });
});
