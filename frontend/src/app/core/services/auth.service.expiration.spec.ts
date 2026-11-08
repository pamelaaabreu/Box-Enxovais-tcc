import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CustomAlertService } from './custom-alert.service';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

describe('JWT session expiration', () => {
  let auth: AuthService;
  let router: jasmine.SpyObj<Router>;
  let alert: jasmine.SpyObj<CustomAlertService>;

  function tokenExpiresIn(seconds: number): string {
    const encode = (value: object) => btoa(JSON.stringify(value))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${encode({alg: 'HS256', typ: 'JWT'})}.${encode({exp: Math.floor(Date.now() / 1000) + seconds})}.test-signature`;
  }

  beforeEach(() => {
    sessionStorage.clear();
    router = jasmine.createSpyObj('Router', ['navigate'], { url: '/cart' });
    router.navigate.and.resolveTo(true);
    alert = jasmine.createSpyObj('CustomAlertService', ['info']);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: CustomAlertService, useValue: alert }],
    });
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    auth.ngOnDestroy();
    sessionStorage.clear();
  });

  it('logs out automatically after a simulated one-minute JWT without interaction', fakeAsync(() => {
    sessionStorage.setItem('authToken', tokenExpiresIn(60));
    sessionStorage.setItem('userName', 'Cliente');
    auth.loadUser();
    expect(auth.isLoggedIn()).toBeTrue();
    tick(61_000);
    expect(auth.getToken()).toBeNull();
    expect(auth.isLogged).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/cart' },
    });
    expect(alert.info).toHaveBeenCalledTimes(1);
  }));

  it('clears an already-expired JWT on application initialization', () => {
    sessionStorage.setItem('authToken', tokenExpiresIn(-60));
    auth.loadUser();
    expect(auth.getToken()).toBeNull();
    expect(auth.isLoggedIn()).toBeFalse();
    expect(alert.info).toHaveBeenCalledTimes(1);
  });

  it('handles repeated unauthorized responses once', () => {
    const token = tokenExpiresIn(60);
    sessionStorage.setItem('authToken', token);
    auth.loadUser();
    auth.handleUnauthorized(token);
    auth.handleUnauthorized(token);
    expect(alert.info).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(auth.getToken()).toBeNull();
  });
});
