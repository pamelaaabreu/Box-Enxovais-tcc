import { CampaignSummaryComponent } from './campaign-summary.component';
import { AdminStateComponent } from '../../shared/components/admin-state/admin-state.component';
import { AdminPageHeaderComponent } from '../../shared/components/admin-page-header/admin-page-header.component';

import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { A11yModule } from '@angular/cdk/a11y';

import { ActivatedRoute, Router } from '@angular/router';

import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';

import { firstValueFrom } from 'rxjs';

import { MatSelectModule } from '@angular/material/select';

import { CustomAlertService } from '../../core/services/custom-alert.service';

import {
  Component,
  OnInit,
  ElementRef,
  viewChild,
  inject,
  HostListener,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { CurrencyPipe, DatePipe } from '@angular/common';

import {
  CreatePromotionRequest,
  Product,
  PromotionRecord,
} from '../../shared/models';

import { PromoService } from '../../core/services/promo.service';

import { ProductService } from '../../core/services/product.service';

import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-create-promotion',

  standalone: true,

  imports: [CampaignSummaryComponent, AdminStateComponent,
    AdminPageHeaderComponent,

    MatButtonToggleModule,

    MatSlideToggleModule,

    A11yModule,

    DatePipe,

    PaginationComponent,

    FormsModule,

    MatIconModule,

    MatSelectModule,

    CurrencyPipe,
  ],

  templateUrl: './create-promotion.component.html',

  styleUrl: './create-promotion.component.scss',
})
export class CreatePromotionComponent implements OnInit {
  readonly pickerTrigger =
    viewChild<ElementRef<HTMLButtonElement>>('pickerTrigger');

  private readonly router = inject(Router, { optional: true });

  private readonly route = inject(ActivatedRoute, { optional: true });

  private readonly confirm = inject(ConfirmDialogService);

  view: 'list' | 'form' | 'detail' = 'form';

  activeTab = 0;

  readonly tabs = ['Geral', 'Produtos', 'Imagens', 'Descontos'];

  submitted = false;

  campaignsLoading = false;

  libraryOpen = false;

  librarySearch = '';

  libraryPage = 1;

  failedImages = new Set<string>();

  private savedSnapshot = '';

  saving = false;

  uploading = false;

  loading = false;

  editingId: number | null = null;

  campaigns: PromotionRecord[] = [];
  campaignSearch = '';
  campaignFilter = 'Todas';
  readonly campaignFilters = ['Todas', 'Ativas', 'Agendadas', 'Encerradas'];
  previewDevice: 'desktop' | 'mobile' = 'desktop';

  campaignCount(filter: string): number {
    const labels: Record<string, string> = { Ativas: 'Ativa', Agendadas: 'Agendada', Encerradas: 'Encerrada' };
    return this.campaigns.filter(item => filter === 'Todas' || this.statusLabel(item) === labels[filter]).length;
  }

  get visibleCampaigns(): PromotionRecord[] {
    const labels: Record<string, string> = { Ativas: 'Ativa', Agendadas: 'Agendada', Encerradas: 'Encerrada' };
    return this.campaigns.filter(item => (this.campaignFilter === 'Todas' || this.statusLabel(item) === labels[this.campaignFilter]) && item.name.toLocaleLowerCase('pt-BR').includes(this.campaignSearch.trim().toLocaleLowerCase('pt-BR')));
  }


  products: Product[] = [];

  search = '';

  categoryId: number | null = null;

  pickerOpen = false;

  pickerPage = 1;

  readonly pickerPageSize = 12;

  draftIds = new Set<number>();

  productsError = '';

  campaignsError = '';

  discountMode: 'percentage' | 'amount' = 'percentage';

  discountValue: number | null = null;

  promotionData: CreatePromotionRequest = this.empty();

  constructor(
    private promoService: PromoService,

    private alerts: CustomAlertService,

    private productService: ProductService,
  ) {}

  ngOnInit(): void {
    this.view = this.route?.snapshot.data['listing']
      ? 'list'
      : this.route?.snapshot.data['readonly']
        ? 'detail'
        : 'form';

    this.savedSnapshot = JSON.stringify(this.promotionData);

    this.refresh();

    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;

    this.productsError = '';

    this.productService.getAdminProducts().subscribe({
      next: (products) => {
        this.products = products;

        this.loading = false;
      },

      error: () => {
        this.loading = false;

        this.productsError =
          'Não foi possível carregar os produtos. Tente novamente.';
      },
    });
  }

  private empty(): CreatePromotionRequest {
    const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)

      .toISOString()

      .slice(0, 16);

    return {
      name: '',

      status: 'active',

      start_date: local,

      end_date: local,

      products: [],
    };
  }

  refresh(): void {
    this.campaignsError = '';

    this.campaignsLoading = true;

    this.promoService.listCampaigns().subscribe({
      next: (items) => {
        this.campaigns = items;

        this.campaignsLoading = false;

        const id = Number(this.route?.snapshot.paramMap.get('id'));

        if (id && this.editingId === null) {
          if (items.some((item) => item.id === id)) this.edit(id);
          else this.campaignsError = 'Campanha não encontrada.';
        }
      },

      error: () => {
        this.campaignsLoading = false;

        this.campaignsError =
          'Não foi possível carregar as campanhas. Tente novamente.';
      },
    });
  }

  get categories(): { id: number; name: string }[] {
    const categories = new Map<number, string>();

    for (const product of this.products)
      if (product.product_type_id && product.category_name)
        categories.set(product.product_type_id, product.category_name);

    return [...categories]

      .map(([id, name]) => ({ id, name }))

      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  get filteredProducts(): Product[] {
    const query = this.search.trim().toLocaleLowerCase('pt-BR');

    return this.products.filter(
      (product) =>
        product.status === 'active' &&
        !this.selected(product.id!) &&
        (this.categoryId === null ||
          product.product_type_id === this.categoryId) &&
        (!query ||
          [
            product.name,

            product.sku,

            product.measurements?.['SKU'],

            product.measurements?.['sku'],
          ].some((value) => value?.toLocaleLowerCase('pt-BR').includes(query))),
    );
  }

  get matchingProducts(): Product[] {
    return this.filteredProducts.slice(
      (this.pickerPage - 1) * this.pickerPageSize,

      this.pickerPage * this.pickerPageSize,
    );
  }

  openPicker(): void {
    this.pickerOpen = true;

    this.draftIds = new Set();

    this.pickerPage = 1;
  }

  cancelPicker(): void {
    this.pickerOpen = false;

    this.draftIds = new Set();

    this.pickerTrigger()?.nativeElement.focus();
  }

  toggleDraft(id: number, event: Event): void {
    const next = new Set(this.draftIds);

    if ((event.target as HTMLInputElement).checked) next.add(id);
    else next.delete(id);

    this.draftIds = next;
  }

  confirmSelection(): void {
    if ((this.promotionData.products?.length ?? 0) + this.draftIds.size > 100) {
      this.alerts.error(
        'Limite de participantes',

        'Selecione até 100 produtos por campanha.',
      );

      return;
    }

    for (const id of this.draftIds) {
      const product = this.product(id);

      if (product?.status === 'active') this.select(product);
    }

    this.cancelPicker();
  }

  selected(id: number): boolean {
    return !!this.promotionData.products?.some((p) => p.product_id === id);
  }

  product(id: number): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  select(product: Product): void {
    if ((this.promotionData.products?.length ?? 0) >= 100) {
      this.alerts.error(
        'Limite de participantes',

        'Selecione até 100 produtos por campanha.',
      );

      return;
    }

    if (!this.selected(product.id!))
      this.promotionData.products = [
        ...(this.promotionData.products ?? []),

        { product_id: product.id! },
      ];
  }

  remove(id: number): void {
    this.promotionData.products = this.promotionData.products?.filter(
      (p) => p.product_id !== id,
    );
  }

  edit(id: number): void {
    const record = this.campaigns.find((p) => p.id === id);

    if (!record) return;

    const local = (value: string) => {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return '';

      return new Date(date.getTime() - date.getTimezoneOffset() * 60000)

        .toISOString()

        .slice(0, 16);
    };

    const { id: recordId, ...data } = record;

    this.cancelPicker();

    this.editingId = recordId;

    this.activeTab = 0;

    this.submitted = false;

    this.promotionData = {
      ...data,

      start_date: local(record.start_date),

      end_date: local(record.end_date),

      products: record.products?.map((p) => ({ ...p })) ?? [],
    };

    this.savedSnapshot = JSON.stringify(this.promotionData);
  }

  applyDiscount(): void {
    const value = this.discountValue;

    if (
      value === null ||
      !Number.isFinite(value) ||
      value < 0 ||
      (this.discountMode === 'percentage' && value > 100) ||
      (this.discountMode === 'amount' &&
        Math.abs(value * 100 - Math.round(value * 100)) > 0.00001)
    ) {
      this.alerts.error(
        'Confira o desconto',

        'Informe um valor válido. Percentuais devem ficar entre 0 e 100.',
      );

      return;
    }

    const items = (this.promotionData.products ?? []).map((item) => {
      const product = this.product(item.product_id);

      if (!product || product.variants?.length) return { ...item };

      const cents = Math.round(product.price * 100);

      const price =
        this.discountMode === 'percentage'
          ? Math.round((cents * (100 - value)) / 100)
          : cents - Math.round(value * 100);

      return { ...item, promotional_price: price / 100 };
    });

    if (
      items.some(
        (item) => item.promotional_price != null && item.promotional_price < 0,
      )
    ) {
      this.alerts.error(
        'Confira o desconto',

        'O desconto não pode ultrapassar o preço original de nenhum produto.',
      );

      return;
    }

    this.promotionData.products = items;
  }

  upload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (file) this.uploadFile(file);

    (event.target as HTMLInputElement).value = '';
  }

  uploadFile(file: File): void {
    if (this.uploading || this.view === 'detail') return;

    if (
      file.size > 10 * 1024 * 1024 ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    ) {
      this.alerts.error(
        'Imagem inválida',

        'Selecione JPEG, PNG ou WebP de até 10 MB.',
      );

      return;
    }

    this.uploading = true;

    this.promoService.uploadCampaignImage(file).subscribe({
      next: (result) => {
        this.promotionData.image_path = result.image_path;

        this.uploading = false;
      },

      error: () => {
        this.uploading = false;

        this.alerts.error(
          'Não foi possível enviar a imagem',

          'Tente novamente.',
        );
      },
    });
  }

  onSubmit(): void {
    if (this.saving || this.uploading || this.view === 'detail') return;

    this.submitted = true;

    if (this.generalError) {
      this.activeTab = 0;

      this.alerts.error(
        'Confira os dados da campanha',

        'Informe um nome e uma data de término posterior ao início.',
      );

      return;
    }

    if (this.promotionData.home_featured && !this.promotionData.image_path) {
      this.activeTab = 2;

      this.alerts.error(
        'Selecione uma imagem para apresentar a campanha na Home.',
      );

      return;
    }

    for (const item of this.promotionData.products ?? []) {
      const product = this.product(item.product_id);

      if (!product || product.status !== 'active') {
        this.activeTab = 1;

        this.alerts.error(
          'Confira os participantes',

          'Remova os produtos indisponíveis para cadastro antes de salvar.',
        );

        return;
      }

      if (product.variants?.length) {
        delete item.promotional_price;

        continue;
      }

      const price = item.promotional_price;

      if (
        price != null &&
        (!Number.isFinite(price) ||
          price < 0 ||
          Math.abs(price * 100 - Math.round(price * 100)) > 0.00001 ||
          (product && price > product.price))
      ) {
        this.activeTab = 3;

        this.alerts.error(
          'Confira o preço promocional',

          'O valor deve ser positivo e não ultrapassar o preço original.',
        );

        return;
      }
    }

    this.saving = true;

    const request: CreatePromotionRequest = {
      name: this.promotionData.name,
      status: this.promotionData.status,
      description: this.promotionData.description,
      image_path: this.promotionData.image_path,
      home_featured: this.promotionData.home_featured,
      products: this.promotionData.products,
      start_date: new Date(this.promotionData.start_date).toISOString(),

      end_date: new Date(this.promotionData.end_date).toISOString(),
    };

    const save = this.editingId
      ? this.promoService.updateCampaign(this.editingId, request)
      : this.promoService.createPromotion(request);

    save.subscribe({
      next: () => {
        this.saving = false;

        this.alerts.success(
          'Campanha salva',

          'As informações da campanha foram atualizadas.',
        );

        this.resetForm();

        this.refresh();

        if (this.router) void this.router.navigate(['/admin/promotions']);
      },

      error: (error) => {
        this.saving = false;

        this.alerts.error(
          'Não foi possível salvar a campanha',

          error.error?.message || 'Tente novamente.',
        );
      },
    });
  }

  resetForm(): void {
    this.cancelPicker();

    this.categoryId = null;

    this.editingId = null;

    this.promotionData = this.empty();

    this.search = '';

    this.discountValue = null;

    this.discountMode = 'percentage';

    this.activeTab = 0;

    this.submitted = false;

    this.savedSnapshot = JSON.stringify(this.promotionData);
  }

  get dirty(): boolean {
    return (
      !!this.savedSnapshot &&
      JSON.stringify(this.promotionData) !== this.savedSnapshot
    );
  }

  get generalError(): boolean {
    return (
      !this.promotionData.name.trim() ||
      this.promotionData.name.length > 255 ||
      (this.promotionData.description?.length ?? 0) > 2000 ||
      !['active', 'inactive'].includes(this.promotionData.status) ||
      !(
        new Date(this.promotionData.end_date) >
        new Date(this.promotionData.start_date)
      ) ||
      (!!this.promotionData.home_featured &&
        !this.promotionData.description?.trim())
    );
  }

  get duration(): string {
    const hours =
      (new Date(this.promotionData.end_date).getTime() -
        new Date(this.promotionData.start_date).getTime()) /
      3600000;

    if (!Number.isFinite(hours) || hours <= 0)
      return 'Defina um período válido.';

    return hours >= 24
      ? `${Math.ceil(hours / 24)} dias`
      : `${Math.ceil(hours)} horas`;
  }

  get campaignMeta(): string {
    if (!this.editingId)
      return 'Configure as informações e o período da campanha.';
    const format = (value?: string) => {
      if (!value) return '';
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          });
    };
    const start = format(this.promotionData.start_date);
    const end = format(this.promotionData.end_date);
    const parts = [
      start && end ? `${start} a ${end}` : '',
      this.validPeriod ? this.duration : '',
    ].filter(Boolean);
    // Só exibe atualização quando ela estiver presente na resposta da API.
    const record = this.campaigns.find((item) => item.id === this.editingId) as
      | (PromotionRecord & { updated_at?: string; updatedAt?: string })
      | undefined;
    const updated = format(record?.updated_at ?? record?.updatedAt);
    if (updated) parts.push(`Atualizado em ${updated}`);
    return parts.join(' · ');
  }

  get hasValidImage(): boolean {
    return (
      !!this.promotionData.image_path &&
      !this.failedImages.has(this.promotionData.image_path)
    );
  }

  get hasAvailableParticipants(): boolean {
    return !!this.promotionData.products?.some((item) => {
      const p = this.product(item.product_id);
      return p?.status === 'active' && p.quantity > 0;
    });
  }

  get hasConfiguredDiscount(): boolean {
    return (
      this.discountSummary !== 'Sem desconto configurado' &&
      this.discountSummary !== 'Revisar descontos'
    );
  }

  get readyForHome(): boolean {
    const now = Date.now();
    return (
      !!this.promotionData.home_featured &&
      this.promotionData.status === 'active' &&
      this.validPeriod &&
      !this.generalError &&
      this.hasValidImage &&
      this.hasAvailableParticipants &&
      new Date(this.promotionData.start_date).getTime() <= now &&
      new Date(this.promotionData.end_date).getTime() > now
    );
  }

  get homeSummary(): string {
    if (!this.promotionData.home_featured)
      return 'Exibição na Home desativada.';

    if (
      !this.promotionData.products?.some((item) => {
        const p = this.product(item.product_id);

        return p?.status === 'active' && p.quantity > 0;
      })
    )
      return this.promotionData.products?.length ? 'Os produtos da campanha precisam estar ativos e em estoque para aparecer na Home.' : 'Adicione produtos para exibir esta campanha na Home.';

    if (this.generalError || !this.promotionData.image_path)
      return 'Complete os dados e a imagem para apresentar na Home.';

    const now = Date.now();

    if (this.promotionData.status !== 'active')
      return 'Campanha inativa; não aparece na Home.';

    if (new Date(this.promotionData.end_date).getTime() <= now)
      return 'Campanha encerrada; não aparece na Home.';

    const count = this.promotionData.products?.length || 0;
    return `Pronta para a Home: a vitrine aparece na vigência, com ${count} ${count === 1 ? 'produto disponível' : 'produtos disponíveis'}.`;
  }

  statusLabel(campaign: PromotionRecord): string {
    if (campaign.status !== 'active') return 'Inativa';

    if (new Date(campaign.end_date).getTime() <= Date.now()) return 'Encerrada';

    return new Date(campaign.start_date).getTime() > Date.now()
      ? 'Agendada'
      : 'Ativa';
  }

  navigate(path: string): void {
    if (this.router) void this.router.navigateByUrl(path);
  }

  async canLeave(): Promise<boolean> {
    if (this.saving || this.uploading) return false;

    if (!this.dirty || this.view === 'detail' || this.view === 'list')
      return true;

    return !!(await firstValueFrom(
      this.confirm

        .open({
          title: 'Descartar alterações?',

          message: 'As alterações não salvas nesta promoção serão perdidas.',

          variant: 'warning',

          primary: 'Descartar alterações',

          secondary: 'Continuar editando',
        })

        .afterClosed(),
    ));
  }

  async cancel(): Promise<void> {
    if (!(await this.canLeave())) return;

    this.resetForm();

    this.navigate('/admin/promotions');
  }

  @HostListener('window:beforeunload', ['$event'])
  protectChanges(event: BeforeUnloadEvent): void {
    if (this.dirty) event.preventDefault();
  }

  chooseTab(index: number): void {
    this.activeTab = index;
  }

  moveTab(event: KeyboardEvent, index: number): void {
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? 3
          : event.key === 'ArrowRight'
            ? (index + 1) % 4
            : event.key === 'ArrowLeft'
              ? (index + 3) % 4
              : null;

    if (next === null) return;

    event.preventDefault();

    this.activeTab = next;

    const target = (
      event.currentTarget as HTMLElement
    ).parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next];

    target?.focus();
  }

  assetUrl(path?: string): string {
    if (!path) return '';

    try {
      const url = new URL(
        path.trim().replace(/\\/g, '/'),

        'http://localhost:8080/',
      );

      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  failImage(path: string): void {
    this.failedImages = new Set([...this.failedImages, path]);
  }

  get libraryImages(): string[] {
    const paths = [
      ...this.campaigns.map((c) => c.image_path),

      ...this.products.flatMap((p) => p.image_paths ?? []),
    ];

    return [
      ...new Set(
        paths

          .filter((path): path is string => !!path)

          .map((path) => {
            try {
              return new URL(this.assetUrl(path)).pathname.replace(/^\//, '');
            } catch {
              return '';
            }
          })

          .filter((path) => /^uploads\/[^/]+\.(?:webp|png|jpe?g)$/i.test(path)),
      ),
    ].filter((path) =>
      path.toLocaleLowerCase().includes(this.librarySearch.toLocaleLowerCase()),
    );
  }

  chooseImage(path: string): void {
    this.promotionData.image_path = path;

    this.libraryOpen = false;
  }

  dropImage(event: DragEvent): void {
    event.preventDefault();

    const file = event.dataTransfer?.files[0];

    if (file) this.uploadFile(file);
  }

  finalPrice(id: number): number {
    const item = this.promotionData.products?.find(
      (item) => item.product_id === id,
    );

    return item?.promotional_price ?? this.product(id)?.price ?? 0;
  }

  discountPercent(id: number): number {
    const base = this.product(id)?.price ?? 0;

    return base
      ? Math.round((1 - this.finalPrice(id) / base) * 10000) / 100
      : 0;
  }

  get validPeriod(): boolean {
    return (
      new Date(this.promotionData.end_date) >
      new Date(this.promotionData.start_date)
    );
  }

  invalidPrice(id: number): boolean {
    const value = this.promotionData.products?.find(
      (item) => item.product_id === id,
    )?.promotional_price;

    return (
      value != null &&
      (!Number.isFinite(value) ||
        value < 0 ||
        value > (this.product(id)?.price ?? 0) ||
        Math.abs(value * 100 - Math.round(value * 100)) > 0.00001)
    );
  }

  tabError(index: number): boolean {
    return index === 0
      ? this.generalError
      : index === 1
        ? !!this.promotionData.products?.some(
            (item) => this.product(item.product_id)?.status !== 'active',
          )
        : index === 2
          ? !!this.promotionData.home_featured && !this.promotionData.image_path
          : !!this.promotionData.products?.some((item) =>
              this.invalidPrice(item.product_id),
            );
  }

  homeLabel(campaign: PromotionRecord): string {
    if (!campaign.home_featured) return 'Desativada';

    if (
      !campaign.products?.some((item) => {
        const p = this.product(item.product_id);

        return p?.status === 'active' && p.quantity > 0;
      }) ||
      !campaign.image_path ||
      !campaign.description?.trim()
    )
      return 'Fora da Home';

    const status = this.statusLabel(campaign);

    return status === 'Ativa'
      ? 'Apta para exibição'
      : status === 'Agendada'
        ? 'Agendada'
        : 'Indisponível';
  }

  get discountedProductCount(): number {
    return (this.promotionData.products ?? []).filter(item => !this.product(item.product_id)?.variants?.length && !this.invalidPrice(item.product_id) && this.discountPercent(item.product_id) > 0).length;
  }

  get discountSummary(): string {
    const items = (this.promotionData.products ?? []).filter(
      (item) => !this.product(item.product_id)?.variants?.length,
    );

    if (items.some((item) => this.invalidPrice(item.product_id)))
      return 'Revisar descontos';

    const values = items.map((item) => this.discountPercent(item.product_id));

    if (!values.length || values.every((value) => value === 0))
      return 'Sem desconto configurado';

    return values.every((value) => value === values[0])
      ? `${values[0]}%`
      : 'Por produto';
  }

  rowDiscountValue(id: number): number {
    return this.discountMode === 'percentage'
      ? this.discountPercent(id)
      : Math.round(
          ((this.product(id)?.price ?? 0) - this.finalPrice(id)) * 100,
        ) / 100;
  }

  setRowDiscount(id: number, value: number | null): void {
    const item = this.promotionData.products?.find(
        (item) => item.product_id === id,
      ),
      product = this.product(id);

    if (!item || !product || product.variants?.length) return;

    if (value === null) {
      delete item.promotional_price;

      return;
    }

    item.promotional_price =
      !Number.isFinite(value) ||
      value < 0 ||
      (this.discountMode === 'percentage' && value > 100) ||
      (this.discountMode === 'amount' &&
        Math.abs(value * 100 - Math.round(value * 100)) > 0.00001)
        ? Number.NaN
        : this.discountMode === 'percentage'
          ? Math.round((product.price * 100 * (100 - value)) / 100) / 100
          : Math.round((product.price - value) * 100) / 100;
  }
}
