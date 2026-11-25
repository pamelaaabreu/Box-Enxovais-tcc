import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('API authentication boundary', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', [
      'getToken',
      'isLoggedIn',
      'handleUnauthorized',
    ]);
    auth.getToken.and.returnValue('current-token');
    auth.isLoggedIn.and.returnValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test/v1/' },
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('authenticates only endpoints inside the configured API path', () => {
    const url = 'https://api.example.test/v1/orders';
    http.get(url).subscribe();
    const request = requests.expectOne(url);
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer current-token',
    );
    request.flush({});
  });

  for (const url of [
    '/assets/config.json',
    'https://viacep.com.br/ws/87502100/json/',
    'https://api.example.test/v10/orders',
    'https://api.example.test/v1/login',
    'https://api.example.test/v1/api/newsletter/subscribe',
  ]) {
    it(`does not attach credentials to ${url}`, () => {
      http.get(url).subscribe();
      const request = requests.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBeFalse();
      request.flush({});
    });
  }

  it('passes the token used by a rejected request to session handling', () => {
    const url = 'https://api.example.test/v1/orders';
    http.get(url).subscribe({ error: () => undefined });
    requests
      .expectOne(url)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.handleUnauthorized).toHaveBeenCalledOnceWith('current-token');
  });
});
