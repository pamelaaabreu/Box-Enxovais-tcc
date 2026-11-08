import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FavoriteButtonComponent } from './favorite-button.component';
import { FavoritesService } from '../../core/services/favorites.service';

describe('FavoriteButton accessibility', () => {
  it('reflects confirmed state, prevents card navigation and blocks unknown/pending state', () => {
    const selected = signal(false),
      synchronized = signal(true),
      pending = signal<ReadonlySet<number>>(new Set());
    const toggle = jasmine.createSpy('toggle');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FavoritesService,
          useValue: {
            isFavorite: () => selected(),
            synchronized,
            pending,
            authenticated: () => true,
            loading: () => false,
            errors: () => ({}),
            syncError: () => '',
            toggle,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(FavoriteButtonComponent);
    fixture.componentRef.setInput('productId', 7);
    fixture.componentRef.setInput('productName', 'Colcha');
    fixture.detectChanges();
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('button');
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    const stop = spyOn(click, 'stopPropagation').and.callThrough();
    button.dispatchEvent(click);
    expect(click.defaultPrevented).toBeTrue();
    expect(stop).toHaveBeenCalled();
    expect(toggle).toHaveBeenCalledWith(7);
    selected.set(true);
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toContain('Remover Colcha');
    pending.set(new Set([7]));
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-busy')).toBe('true');
    pending.set(new Set());
    synchronized.set(false);
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
  });
});
