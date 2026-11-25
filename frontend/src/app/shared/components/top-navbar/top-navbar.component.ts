import {
  merge,
  Subject,
  timer,
  of,
  switchMap,
  distinctUntilChanged,
  catchError,
  map,
} from 'rxjs';
import { signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';
import { CatalogService } from '../../../features/catalog/services/catalog.service';
import { CatalogProduct } from '../../types/catalog/catalog-product';
import { CartService } from '../../../core/services/cart.service';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Inject,
  Input,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-top-navbar',
  standalone: true,
  imports: [
    CurrencyPipe,
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
  ],
  templateUrl: './top-navbar.component.html',
  styleUrls: ['./top-navbar.component.scss'],
})
export class TopNavbarComponent implements OnInit {
  private readonly products = inject(ProductService);
  private readonly catalog = inject(CatalogService);
  private readonly searchTerms = new Subject<string>();
  readonly searchResults = signal<CatalogProduct[]>([]);
  readonly searchLoading = signal(false);
  readonly searchError = signal(false);
  readonly searchOpen = signal(false);
  readonly searchTerm = signal('');
  readonly activeResult = signal(-1);
  constructorSearch(): void {
    this.searchTerms
      .pipe(
        distinctUntilChanged(),
        switchMap((term) => {
          this.searchResults.set([]);
          this.searchError.set(false);
          this.activeResult.set(-1);
          if (!term) {
            this.searchLoading.set(false);
            return of([] as CatalogProduct[]);
          }
          this.searchLoading.set(true);
          return timer(250).pipe(
            switchMap(() =>
              this.products.getProductsPage({
                limit: 6,
                filters: { search__contains: term },
              }),
            ),
            map((page) => page.items.map((p) => this.catalog.adapt(p))),
            catchError(() => {
              this.searchError.set(true);
              return of([] as CatalogProduct[]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.searchResults.set(items);
        this.searchLoading.set(false);
      });
  }
  changeSearch(value: string): void {
    const term = value.trim();
    this.searchTerm.set(term);
    this.searchOpen.set(!!term);
    this.searchTerms.next(term);
  }
  searchKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.searchOpen.set(false);
      this.activeResult.set(-1);
      event.preventDefault();
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const size = this.searchResults().length;
      if (size)
        this.activeResult.set(
          (this.activeResult() + (event.key === 'ArrowDown' ? 1 : -1) + size) %
            size,
        );
      this.searchOpen.set(true);
    }
    if (
      event.key === 'Enter' &&
      this.activeResult() >= 0 &&
      this.searchOpen()
    ) {
      event.preventDefault();
      const p = this.searchResults()[this.activeResult()];
      this.searchOpen.set(false);
      void this.router.navigate(['/produto', p.slug]);
    }
  }

  @Input() isScrolled = false;
  readonly cartService = inject(CartService);
  get cartCount(): number {
    return this.cartService.totalItems();
  }

  isLoggedIn = false;
  isMenuOpen = false;
  userName: string | null = null;
  isLoading = true;
  isAdmin = false;

  private readonly changeDetector = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading = false;
      return;
    }

    this.constructorSearch();
    this.authService.loadUser();
    this.updateUserInfo();
    this.isLoading = false;

    merge(this.authService.userChanged, this.authService.savedNameChanged)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateUserInfo();
        this.changeDetector.markForCheck();
      });
  }

  updateUserInfo(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isLoggedIn = this.authService.isLoggedIn();
    this.userName = this.getFirstName(this.authService.getUserName());

    const role = this.authService.getUserRole();
    this.isAdmin = role?.trim().toLowerCase() === 'admin';
  }

  searchProducts(value: string): void {
    this.searchOpen.set(false);
    const term = value.trim();
    void this.router.navigate(['/categoria', 'todos'], {
      queryParams: term ? { q: term } : {},
    });
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isMenuOpen = false;
    this.authService.logout();

    this.isLoggedIn = false;
    this.userName = null;
    this.isAdmin = false;
  }

  private getFirstName(fullName: string | null): string | null {
    if (!fullName) {
      return null;
    }

    return fullName.trim().split(' ')[0] || null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isMenuOpen = false;
      this.searchOpen.set(false);
    }
  }
}
