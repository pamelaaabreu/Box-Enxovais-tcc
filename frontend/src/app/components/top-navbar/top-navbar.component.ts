import { CartService } from '../../core/services/cart.service';
import {
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
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-top-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './top-navbar.component.html',
  styleUrls: ['./top-navbar.component.css'],
})
export class TopNavbarComponent implements OnInit {
  @Input() isScrolled = false;
  readonly cartService = inject(CartService);
  get cartCount(): number { return this.cartService.totalItems(); }

  isLoggedIn = false;
  isMenuOpen = false;
  userName: string | null = null;
  isLoading = true;
  isAdmin = false;

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

    this.authService.loadUser();
    this.updateUserInfo();
    this.isLoading = false;

    this.authService.userChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateUserInfo();
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
    }
  }
}
