import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  switchMap,
  timer,
} from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CampaignService } from '../../core/services/campaign.service';
import { CatalogService } from '../catalog/services/catalog.service';
import { CatalogLayoutComponent } from '../catalog/components/catalog-layout/catalog-layout.component';
import { ProductCardComponent } from '../catalog/components/product-card/product-card.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { HomeCampaign } from '../../shared/models';
@Component({
  selector: 'app-campaign',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    FormsModule,
    MatSelectModule,
    CatalogLayoutComponent,
    ProductCardComponent,
    PaginationComponent,
  ],
  templateUrl: './campaign.component.html',
  styleUrl: './campaign.component.scss',
})
export class CampaignComponent {
  readonly campaigns = inject(CampaignService);
  readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  readonly fullPage = !!this.route.snapshot.paramMap.get('id');
  readonly search = signal('');
  readonly sort = signal('name');
  readonly page = signal(1);
  readonly pageSize = 12;
  private readonly state = toSignal(
    this.fullPage
      ? combineLatest([this.route.paramMap, timer(0, 30000)]).pipe(
          switchMap(([params]) =>
            this.campaigns.get(params.get('id') ?? '').pipe(
              map((data) => ({ loading: false, data })),
              startWith({ loading: true, data: null as HomeCampaign | null }),
              catchError(() =>
                of({ loading: false, data: null as HomeCampaign | null }),
              ),
            ),
          ),
        )
      : of({ loading: false, data: null as HomeCampaign | null }),
    { initialValue: { loading: true, data: null as HomeCampaign | null } },
  );
  readonly loading = computed(() => this.fullPage && this.state().loading);
  readonly campaign = computed(() => {
    this.campaigns.now();
    const campaign = this.fullPage
      ? this.state().data
      : this.campaigns.active();
    return this.campaigns.eligible(campaign) ? campaign : null;
  });
  readonly products = computed(() => {
    const seen = new Set<number>();
    const query = this.search().trim().toLocaleLowerCase('pt-BR');
    const products = (this.campaign()?.products ?? [])
      .filter((p) => {
        if (
          !p.id ||
          seen.has(p.id) ||
          p.status !== 'active' ||
          p.quantity <= 0 ||
          !p.name.toLocaleLowerCase('pt-BR').includes(query)
        )
          return false;
        seen.add(p.id);
        return true;
      })
      .map((p) => this.catalog.adapt(p));
    if (!this.fullPage) return products.slice(0, 4);
    const price = (p: (typeof products)[number]) =>
      p.promotion_active ? p.promotional_price : p.price;
    return products.sort((a, b) =>
      this.sort() === 'price'
        ? price(a) - price(b)
        : a.name.localeCompare(b.name, 'pt-BR'),
    );
  });
  readonly visibleProducts = computed(() =>
    this.fullPage
      ? this.products().slice(
          (this.page() - 1) * this.pageSize,
          this.page() * this.pageSize,
        )
      : this.products(),
  );
}
