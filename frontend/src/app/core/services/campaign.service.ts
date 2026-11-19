import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, timer } from 'rxjs';
import { HomeCampaign } from '../../shared/models';
@Injectable({ providedIn: 'root' })
export class CampaignService {
    private readonly http = inject(HttpClient);
    readonly now = toSignal(timer(0, 1000), { initialValue: 0 });
    private readonly featured = toSignal(timer(0, 30000).pipe(switchMap(() => this.http.get<HomeCampaign | null>('http://localhost:8080/home/campaign').pipe(catchError(() => of(null))))), { initialValue: null });
    readonly active = computed(() => { this.now(); const campaign = this.featured(); return this.eligible(campaign) ? campaign : null; });
    eligible(campaign: HomeCampaign | null): campaign is HomeCampaign { return !!campaign && campaign.products.length > 0 && Date.now() >= Date.parse(campaign.startDate) && Date.now() <= Date.parse(campaign.endDate); }
    get(id: string) { return this.http.get<HomeCampaign>('http://localhost:8080/campaigns/' + encodeURIComponent(id)); }
}
