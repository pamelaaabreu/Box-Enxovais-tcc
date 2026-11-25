import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogLayoutComponent } from '../../catalog/components/catalog-layout/catalog-layout.component';
@Component({
  standalone: true,
  imports: [CatalogLayoutComponent, RouterLink],
  templateUrl: './institutional-page.component.html',
  styleUrl: './institutional-page.component.scss',
})
export class InstitutionalPageComponent {
  readonly page = inject(ActivatedRoute).snapshot.data as {
    title: string;
    paragraphs: string[];
  };
}
