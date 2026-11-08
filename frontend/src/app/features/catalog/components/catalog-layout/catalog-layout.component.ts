import { ViewportScroller } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, inject, afterNextRender, DestroyRef, ElementRef, viewChild } from '@angular/core';
import { TopWelcomeHeaderComponent } from '../../../../components/top-welcome-header/top-welcome-header.component';
import { TopNavbarComponent } from '../../../../components/top-navbar/top-navbar.component';
import { MainNavbarComponent } from '../../../../components/main-navbar/main-navbar.component';
import { FooterComponent } from '../../../../components/footer/footer.component';

@Component({
  selector: 'app-catalog-layout',
  standalone: true,
  imports: [TopWelcomeHeaderComponent, TopNavbarComponent, MainNavbarComponent, FooterComponent],
  templateUrl: './catalog-layout.component.html',
  styleUrl: './catalog-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogLayoutComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly viewportScroller = inject(ViewportScroller);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly header = viewChild.required('catalogHeader', { read: ElementRef });
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const element = this.header().nativeElement as HTMLElement;
      const updateHeight = () => this.host.nativeElement.style.setProperty('--catalog-header-height', `${element.getBoundingClientRect().height}px`);
      updateHeight();
      const observer = new ResizeObserver(updateHeight);
      observer.observe(element);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => {
      this.viewportScroller.scrollToPosition([0, 0]);
    });
  }
}
