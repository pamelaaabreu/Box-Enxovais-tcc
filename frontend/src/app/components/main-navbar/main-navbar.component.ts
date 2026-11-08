import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES } from '../../features/catalog/data/categories';

@Component({
  selector: 'app-main-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './main-navbar.component.html',
  styleUrl: './main-navbar.component.css',
})
export class MainNavbarComponent {
  @Input() isHidden = false;
  @ViewChild('categoryToggle') private categoryToggle?: ElementRef<HTMLButtonElement>;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  isMenuOpen = false;
  readonly categories = CATEGORIES;

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
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
