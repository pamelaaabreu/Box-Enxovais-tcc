import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../core/services/auth.service';
import { CustomAlertService } from '../../core/services/custom-alert.service';

describe('ForgotPasswordComponent recovery', () => {
  let component: ForgotPasswordComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', [
      'validateResetCode',
      'requestPasswordReset',
      'savePasswordResetToken',
      'clearPasswordResetEmail',
      'clearPasswordResetToken',
      'savePasswordResetEmail',
    ]);
    router = jasmine.createSpyObj(
      'Router',
      ['navigate', 'createUrlTree', 'serializeUrl'],
      { events: of() },
    );
    router.createUrlTree.and.returnValue(new UrlTree());
    router.serializeUrl.and.returnValue('/login');
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
        {
          provide: CustomAlertService,
          useValue: jasmine.createSpyObj('Alert', ['success', 'error']),
        },
      ],
    });
    component = TestBed.runInInjectionContext(
      () => new ForgotPasswordComponent(),
    );
    component.step = 'otp';
    component.forgotForm.controls.email.setValue('user@example.com');
  });
  afterEach(() => component.ngOnDestroy());
  function paste(code: string) {
    component.onOtpPaste({
      preventDefault: () => {},
      clipboardData: { getData: () => code },
    } as unknown as ClipboardEvent);
  }
  function initialSend() {
    const response = new Subject<any>();
    auth.requestPasswordReset.and.returnValue(response);
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.componentInstance.forgotForm.controls.email.setValue(
      'user@example.com',
    );
    fixture.detectChanges();
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('.submit-button');
    button.click();
    fixture.detectChanges();
    return { fixture, response, button };
  }
  it('does not show the send overlay or request a code for invalid email', () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.submit-button').click();
    fixture.detectChanges();
    expect(auth.requestPasswordReset).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('.recovery-send-overlay.is-active'),
    ).toBeNull();
    expect(
      fixture.componentInstance.forgotForm.controls.email.touched,
    ).toBeTrue();
    fixture.destroy();
  });
  it('shows an accessible viewport overlay immediately and prevents duplicate sends', () => {
    const { fixture, button } = initialSend();
    const overlay: HTMLElement = fixture.nativeElement.querySelector(
      '.recovery-send-overlay',
    );
    const content: HTMLElement =
      fixture.nativeElement.querySelector('.auth-card');
    expect(overlay.classList.contains('is-active')).toBeTrue();
    expect(overlay.getAttribute('role')).toBe('status');
    expect(overlay.getAttribute('aria-hidden')).toBe('false');
    expect(overlay.textContent).toContain('Enviando seu código...');
    expect(content.getAttribute('aria-busy')).toBe('true');
    expect(content.hasAttribute('inert')).toBeTrue();
    expect(overlay.closest('.auth-card')).toBeNull();
    expect(getComputedStyle(overlay).position).toBe('fixed');
    const bounds = overlay.getBoundingClientRect();
    expect(bounds.top).toBe(0);
    expect(bounds.left).toBe(0);
    expect(
      Math.abs(bounds.width - document.documentElement.clientWidth),
    ).toBeLessThan(1);
    expect(
      Math.abs(bounds.height - document.documentElement.clientHeight),
    ).toBeLessThan(1);
    expect(button.disabled).toBeTrue();
    button.click();
    fixture.componentInstance.onSubmit();
    expect(auth.requestPasswordReset).toHaveBeenCalledOnceWith(
      'user@example.com',
    );
    fixture.destroy();
  });
  it('hides the overlay when navigating to OTP and preserves the success notification', () => {
    const { fixture, response } = initialSend();
    response.next({ success: true });
    response.complete();
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/verify-code']);
    expect(auth.savePasswordResetEmail).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(TestBed.inject(CustomAlertService).success).toHaveBeenCalled();
    expect(fixture.componentInstance.step).toBe('otp');
    expect(
      fixture.nativeElement.querySelector('.recovery-send-overlay.is-active'),
    ).toBeNull();
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading).toBeFalse();
    expect(
      fixture.nativeElement.querySelector('.auth-card').hasAttribute('inert'),
    ).toBeFalse();
    fixture.destroy();
  });
  it('clears the overlay on error, preserves email and permits retry', () => {
    const { fixture, response, button } = initialSend();
    response.error(new HttpErrorResponse({ status: 500 }));
    fixture.detectChanges();
    expect(fixture.componentInstance.isLoading).toBeFalse();
    expect(fixture.componentInstance.forgotForm.controls.email.value).toBe(
      'user@example.com',
    );
    expect(
      fixture.nativeElement
        .querySelector('.recovery-send-overlay')
        .getAttribute('aria-hidden'),
    ).toBe('true');
    expect(
      fixture.nativeElement
        .querySelector('.auth-card')
        .getAttribute('aria-busy'),
    ).toBe('false');
    expect(
      fixture.nativeElement.querySelector('.auth-card').hasAttribute('inert'),
    ).toBeFalse();
    expect(TestBed.inject(CustomAlertService).error).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    auth.requestPasswordReset.and.returnValue(new Subject<any>());
    button.click();
    expect(auth.requestPasswordReset).toHaveBeenCalledTimes(2);
    fixture.destroy();
  });
  it('clears sending state when destroyed during a request', () => {
    const { fixture } = initialSend();
    const page = fixture.componentInstance;
    fixture.destroy();
    expect(page.isLoading).toBeFalse();
  });
  it('shows the full-screen overlay for OTP verification but not for resend', () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    const page = fixture.componentInstance;
    page.step = 'otp';
    page.isLoading = true;
    fixture.detectChanges();
    const overlay: HTMLElement = fixture.nativeElement.querySelector(
      '.recovery-send-overlay',
    );
    expect(overlay.classList.contains('is-active')).toBeTrue();
    expect(overlay.textContent).toContain('Validando seu código...');
    expect(
      fixture.nativeElement.querySelector('.auth-card').hasAttribute('inert'),
    ).toBeTrue();
    page.isResending = true;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.recovery-send-overlay.is-active'),
    ).toBeNull();
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(
      fixture.nativeElement.querySelector('.auth-card').hasAttribute('inert'),
    ).toBeFalse();
    fixture.destroy();
  });
  [1440, 1024, 768, 390, 375, 320].forEach((width) => {
    it(`aligns all eight OTP fields with the button at ${width}px without overflow`, async () => {
      const fixture = TestBed.createComponent(ForgotPasswordComponent);
      fixture.componentInstance.step = 'otp';
      fixture.componentInstance.forgotForm.controls.email.setValue(
        'user@example.com',
      );
      fixture.detectChanges();
      const frame = document.createElement('iframe');
      frame.style.cssText = `width:${width}px;height:1200px;border:0;display:block;`;
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        document
          .querySelectorAll('style, link[rel="stylesheet"]')
          .forEach((style) => {
            doc.head.appendChild(style.cloneNode(true));
          });
        doc.body.style.margin = '0';
        doc.body.appendChild(fixture.nativeElement);
        // Font loading inside a cloned iframe can stall when the entire
        // Karma suite runs. Keep the wait bounded instead of hanging Jasmine.
        await Promise.race([
          doc.fonts.ready.then(() => undefined).catch(() => undefined),
          new Promise<void>((resolve) => setTimeout(resolve, 1200)),
        ]);
        // Geometry reads below force a synchronous layout calculation.
        // A requestAnimationFrame is unnecessary and may be throttled in CI.
        const fields = Array.from(
          doc.querySelectorAll<HTMLInputElement>('.otp-input'),
        );
        const button = doc
          .querySelector('.otp-submit')!
          .getBoundingClientRect();
        const boxes = fields.map((field) => field.getBoundingClientRect());
        expect(frame.contentWindow!.innerWidth).toBe(width);
        expect(fields.length).toBe(8);
        expect(Math.abs(boxes[0].left - button.left)).toBeLessThan(1);
        expect(Math.abs(boxes[7].right - button.right)).toBeLessThan(1);
        const gap = boxes[1].left - boxes[0].right;
        boxes.forEach((box, index) => {
          expect(box.width).toBeGreaterThanOrEqual(26);
          expect(Math.abs(box.width - boxes[0].width)).toBeLessThan(1);
          expect(box.top).toBe(boxes[0].top);
          expect(box.height).toBe(width <= 700 ? 44 : 54);
          if (index)
            expect(
              Math.abs(box.left - boxes[index - 1].right - gap),
            ).toBeLessThan(1);
        });
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(
          doc.documentElement.clientWidth,
        );
      } finally {
        fixture.destroy();
        frame.remove();
      }
    }, 15000);
  });
  it('submits from the actual eight-input form and navigates after verification', () => {
    const response = new Subject<any>();
    auth.validateResetCode.and.returnValue(response);
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    const page = fixture.componentInstance;
    page.step = 'otp';
    page.forgotForm.controls.email.setValue('user@example.com');
    fixture.detectChanges();
    const inputs: NodeListOf<HTMLInputElement> =
      fixture.nativeElement.querySelectorAll('.otp-input');
    'AB12CD34'.split('').forEach((character, index) => {
      inputs[index].value = character;
      inputs[index].dispatchEvent(new Event('input', { bubbles: true }));
    });
    fixture.detectChanges();
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('.otp-submit');
    expect(button.disabled).toBeFalse();
    // Prevent native navigation even if the Angular submit binding regresses.
    fixture.nativeElement
      .querySelector('form')
      .addEventListener('submit', (event: Event) => event.preventDefault());
    button.click();
    expect(auth.validateResetCode).toHaveBeenCalledOnceWith(
      'user@example.com',
      'AB12CD34',
    );
    expect(page.isLoading).toBeTrue();
    response.next({ success: true, data: { resetToken: 'test-reset-token' } });
    response.complete();
    expect(auth.savePasswordResetToken).toHaveBeenCalledWith(
      'test-reset-token',
    );
    expect(router.navigate).toHaveBeenCalledWith(['/reset-password']);
    fixture.destroy();
  });
  it('pastes eight characters, normalizes case and refuses incomplete codes', () => {
    paste('ab12cd34');
    expect(component.otpForm.getRawValue().join('')).toBe('AB12CD34');
    paste('abc');
    component.onSubmit();
    expect(auth.validateResetCode).not.toHaveBeenCalled();
  });
  it('submits a single request and navigates with an in-memory token', () => {
    const response = new Subject<any>();
    auth.validateResetCode.and.returnValue(response);
    paste('AB12CD34');
    component.onSubmit();
    component.onSubmit();
    expect(auth.validateResetCode).toHaveBeenCalledTimes(1);
    expect(component.isLoading).toBeTrue();
    response.next({ success: true, data: { resetToken: 'secret' } });
    response.complete();
    expect(auth.savePasswordResetToken).toHaveBeenCalledWith('secret');
    expect(router.navigate).toHaveBeenCalledWith(['/reset-password']);
    expect(component.isLoading).toBeFalse();
  });
  [400, 410, 0, 500].forEach((status) =>
    it(`handles error ${status}`, () => {
      auth.validateResetCode.and.returnValue(
        throwError(() => new HttpErrorResponse({ status })),
      );
      paste('AB12CD34');
      component.onSubmit();
      expect(component.otpError).toContain(
        status === 410
          ? 'expirou'
          : status === 400
            ? 'inválido'
            : status === 0
              ? 'conexão'
              : 'Não foi possível',
      );
      expect(router.navigate).not.toHaveBeenCalled();
      expect(component.isLoading).toBeFalse();
    }),
  );
  it('respects cooldown and clears the old code after resend', () => {
    auth.requestPasswordReset.and.returnValue(of({ success: true }));
    component.resendSeconds = 10;
    component.resendCode();
    expect(auth.requestPasswordReset).not.toHaveBeenCalled();
    component.resendSeconds = 0;
    paste('AB12CD34');
    component.resendCode();
    expect(auth.requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(component.resendSeconds).toBe(30);
    expect(component.otpForm.invalid).toBeTrue();
  });
});

// Real template + AuthService + HttpClient; only the transport and router are
// replaced. No calls to onSubmit() in these tests: submission starts at the DOM.
describe('OTP form HTTP integration', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let router: jasmine.SpyObj<Router>;
  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
        {
          provide: CustomAlertService,
          useValue: jasmine.createSpyObj('Alert', ['success', 'error']),
        },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function submitFromScreen() {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.componentInstance.step = 'otp';
    fixture.componentInstance.forgotForm.controls.email.setValue(
      'user@example.com',
    );
    fixture.detectChanges();
    const fields: NodeListOf<HTMLInputElement> =
      fixture.nativeElement.querySelectorAll('.otp-input');
    'AB12CD34'.split('').forEach((value, index) => {
      fields[index].value = value;
      fields[index].dispatchEvent(new Event('input', { bubbles: true }));
    });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.otp-submit').click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.otp-submit').disabled,
    ).toBeTrue();
    const request = http.expectOne('http://localhost:8080/validate-reset-code');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'user@example.com',
      code: 'AB12CD34',
    });
    return { fixture, request };
  }
  it('posts the code and stores the returned token before navigation', () => {
    const { fixture, request } = submitFromScreen();
    router.navigate.and.callFake(() => {
      expect(auth.getPasswordResetToken()).toBe('test-only-token');
      return Promise.resolve(true);
    });
    request.flush({
      success: true,
      message: 'OK',
      data: { resetToken: 'test-only-token' },
    });
    expect(router.navigate).toHaveBeenCalledOnceWith(['/reset-password']);
    fixture.destroy();
  });
  [400, 410, 500].forEach((status) =>
    it(`renders an error after HTTP ${status}`, () => {
      const { fixture, request } = submitFromScreen();
      request.flush({ success: false }, { status, statusText: 'Error' });
      fixture.detectChanges();
      expect(
        fixture.nativeElement
          .querySelector('[role="alert"]')
          .textContent.trim(),
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('.otp-submit').disabled,
      ).toBeFalse();
      expect(auth.getPasswordResetToken()).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
      fixture.destroy();
    }),
  );
});
