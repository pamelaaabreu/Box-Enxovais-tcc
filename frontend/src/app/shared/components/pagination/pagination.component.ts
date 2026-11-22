import { Component, computed, input, output } from '@angular/core';
@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  readonly page = input(1);
  readonly total = input(0);
  readonly pageSize = input(12);
  readonly disabled = input(false);
  readonly label = input('Paginação');
  readonly pageChange = output<number>();
  readonly pages = computed(() =>
    Math.max(
      1,
      Math.ceil(Math.max(0, this.total()) / Math.max(1, this.pageSize())),
    ),
  );
  readonly current = computed(() =>
    Math.max(1, Math.min(this.pages(), this.page())),
  );
  readonly items = computed<(number | string)[]>(() => {
    const n = this.pages(),
      p = this.current();
    if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
    const values = [1, ...[p - 1, p, p + 1].filter((x) => x > 1 && x < n), n];
    const out: (number | string)[] = [];
    for (const v of [...new Set(values)]) {
      const prev = out.at(-1);
      if (typeof prev === 'number' && v - prev > 1) out.push('…');
      out.push(v);
    }
    return out;
  });
  select(page: number) {
    if (
      !this.disabled() &&
      Number.isSafeInteger(page) &&
      page >= 1 &&
      page <= this.pages() &&
      page !== this.current()
    )
      this.pageChange.emit(page);
  }
}
