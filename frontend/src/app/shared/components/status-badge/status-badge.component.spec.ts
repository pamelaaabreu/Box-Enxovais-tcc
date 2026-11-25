import { TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';
describe('StatusBadgeComponent', () => {
  it('keeps the same badge structure for every tone', () => {
    const f = TestBed.createComponent(StatusBadgeComponent);
    for (const tone of ['success', 'danger', 'neutral', 'warning'] as const) {
      f.componentRef.setInput('tone', tone);
      f.detectChanges();
      expect(
        f.nativeElement
          .querySelector('.status-badge')
          .getAttribute('data-tone'),
      ).toBe(tone);
      expect(f.nativeElement.querySelector('button')).toBeNull();
    }
  });
});
