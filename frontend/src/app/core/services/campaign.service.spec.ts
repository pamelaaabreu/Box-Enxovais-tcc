import {
  fakeAsync,
  TestBed,
  tick,
  discardPeriodicTasks,
} from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { CampaignService } from './campaign.service';
import type { HomeCampaign } from '../../shared/types/promotions/promotion';

describe('CampaignService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  it('shows only eligible campaigns and hides them on expiry before the next API refresh', fakeAsync(() => {
    const service = TestBed.inject(CampaignService),
      http = TestBed.inject(HttpTestingController);
    tick(0);
    const campaign: HomeCampaign = {
      id: 1,
      name: 'Natal',
      description: 'Coleção',
      imagePath: 'uploads/natal.webp',
      startDate: new Date(Date.now() - 1000).toISOString(),
      endDate: new Date(Date.now() + 2000).toISOString(),
      products: [
        {
          id: 1,
          name: 'Real',
          price: 10,
          quantity: 2,
          status: 'active',
          measurements: {},
          promotional_price: 10,
        },
      ],
    };
    http.expectOne('http://localhost:8080/home/campaign').flush(campaign);
    expect(service.active()?.id).toBe(1);
    tick(3000);
    expect(service.active()).toBeNull();
    expect(
      service.eligible({
        ...campaign,
        startDate: new Date(Date.now() + 10000).toISOString(),
      }),
    ).toBeFalse();
    expect(service.eligible({ ...campaign, products: [] })).toBeFalse();
    tick(27000);
    http.expectOne('http://localhost:8080/home/campaign').flush(null);
    expect(service.active()).toBeNull();
    http.verify();
    discardPeriodicTasks();
  }));
});
