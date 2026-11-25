import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { AssetUrlService } from './asset-url.service';

describe('AssetUrlService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.example.test/store/' },
      ],
    }),
  );

  it('uses the configured API path and normalizes relative image slashes', () => {
    const service = TestBed.inject(AssetUrlService);
    expect(service.resolve('/uploads/catalogo.webp')).toBe(
      'https://api.example.test/store/uploads/catalogo.webp',
    );
    expect(service.resolve('uploads/catalogo.webp')).toBe(
      'https://api.example.test/store/uploads/catalogo.webp',
    );
  });

  it('preserves external HTTP images and the empty fallback', () => {
    const service = TestBed.inject(AssetUrlService);
    expect(service.resolve('https://images.example.test/image.webp')).toBe(
      'https://images.example.test/image.webp',
    );
    expect(service.resolve(null)).toBe('');
    expect(service.resolve('')).toBe('');
  });
});
