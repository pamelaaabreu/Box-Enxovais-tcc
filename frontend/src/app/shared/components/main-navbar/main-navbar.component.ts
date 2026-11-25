import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../../features/catalog/services/catalog.service';
import { ProductService } from '../../../core/services/product.service';
import { CatalogProduct } from '../../types/catalog/catalog-product';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { signal } from '@angular/core';

@Component({
  selector: 'app-main-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './main-navbar.component.html',
  styleUrl: './main-navbar.component.scss',
})
export class MainNavbarComponent {
  @Input() isHidden = false;
  @ViewChild('categoryToggle')
  private categoryToggle?: ElementRef<HTMLButtonElement>;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  isMenuOpen = false;
  readonly categories = signal<
    {
      name: string;
      slug: string;
      children: { name: string; slug: string; products: CatalogProduct[] }[];
    }[]
  >([]);
  readonly openCategory = signal('');
  private readonly catalog = inject(CatalogService);
  constructor() {
    inject(ProductService)
      .getProducts()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (items) => {
          const groups = new Map<
            string,
            { name: string; slug: string; products: CatalogProduct[] }
          >();
          for (const item of items) {
            const p = this.catalog.adapt(item);
            if (!p.active) continue;
            const key = p.category.slug;
            const group = groups.get(key) ?? {
              name: p.category.name,
              slug: key,
              products: [],
            };
            group.products.push(p);
            groups.set(key, group);
          }
          const result = new Map<
            string,
            {
              name: string;
              slug: string;
              children: typeof groups extends Map<string, infer T>
                ? T[]
                : never;
            }
          >();
          for (const child of groups.values()) {
            const parts = child.name.split(' / ');
            const name = parts[0];
            const slug =
              parts.length > 1
                ? name
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                : child.slug;
            const group = result.get(name) ?? { name, slug, children: [] };
            group.children.push(child);
            result.set(name, group);
          }
          this.categories.set([...result.values()]);
        },
        error: () => this.categories.set([]),
      });
  }
  closeCategory(event: FocusEvent): void {
    if (
      !(event.currentTarget as HTMLElement).contains(
        event.relatedTarget as Node,
      )
    )
      this.openCategory.set('');
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
    this.openCategory.set('');
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeMenu();
    }
  }

  @HostListener('keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    if (this.isMenuOpen) {
      event.preventDefault();
      this.closeMenu();
      this.categoryToggle?.nativeElement.focus();
    }
  }
}
