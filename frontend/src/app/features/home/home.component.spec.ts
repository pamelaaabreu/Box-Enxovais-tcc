import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { NewsletterComponent } from '../newsletter/newsletter.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HomeComponent } from './home.component';
import { CampaignService } from '../../core/services/campaign.service';

describe('Home composition', () => {
  it('keeps approved sections in order, replaces the three editorial blocks and joins newsletter to footer', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CampaignService, useValue: { active: signal(null) } },
      ],
    });
    TestBed.overrideComponent(HomeComponent, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    });
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(
      [...root.querySelector('.home-content')!.children].map((el) =>
        el.tagName.toLowerCase(),
      ),
    ).toEqual([
      'app-carousel',
      'app-trust-bar',
      'app-shop-by-category',
      'app-featured-products',
      'app-campaign',
      'app-testimonials',
    ]);
    expect(root.querySelector('.collection-grid')).toBeNull();
    expect(root.querySelector('.quality-section')).toBeNull();
    const newsletter = root.querySelector('app-newsletter')!;
    expect(newsletter.closest('.home-content')).toBeNull();
    expect(newsletter.nextElementSibling?.tagName).toBe('APP-FOOTER');
  });

  it('renders the newsletter across the full Home width with no gap before the real footer', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: CampaignService, useValue: { active: signal(null) } },
      ],
    });
    TestBed.overrideComponent(HomeComponent, {
      set: {
        imports: [NewsletterComponent, FooterComponent],
        schemas: [NO_ERRORS_SCHEMA],
      },
    });
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const newsletter = root
      .querySelector('.newsletter-section')!
      .getBoundingClientRect();
    const footer = root.querySelector('.footer')!.getBoundingClientRect();
    const home = root.getBoundingClientRect();
    expect(Math.abs(newsletter.left - home.left)).toBeLessThan(1);
    expect(Math.abs(newsletter.right - home.right)).toBeLessThan(1);
    expect(Math.abs(footer.top - newsletter.bottom)).toBeLessThan(1);
  });
});
