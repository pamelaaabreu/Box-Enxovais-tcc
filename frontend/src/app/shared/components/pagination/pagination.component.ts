import { Component, computed, input, output } from '@angular/core';
@Component({
  selector: 'app-pagination',
  standalone: true,
  template: ` <nav [attr.aria-label]="label()" class="pager">
    <div class="controls">
      <button
        type="button"
        aria-label="Página anterior"
        [disabled]="disabled() || current() <= 1"
        title="Página anterior"
        (click)="select(current() - 1)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m14 6-6 6 6 6" />
        </svg>
      </button>
      @for (item of items(); track $index) {
        @if (item === '…') {
          <span aria-hidden="true">…</span>
        } @else {
          <button
            type="button"
            [attr.aria-label]="'Página ' + item"
            [attr.aria-current]="current() === item ? 'page' : null"
            [disabled]="disabled()"
            (click)="select(+item)"
          >
            {{ item }}
          </button>
        }
      }
      <button
        type="button"
        aria-label="Próxima página"
        [disabled]="disabled() || current() >= pages()"
        title="Próxima página"
        (click)="select(current() + 1)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m10 6 6 6-6 6" />
        </svg>
      </button>
    </div>
    <span class="summary" role="status"
      >Página {{ current() }} de {{ pages() }}</span
    >
  </nav>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .pager {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin-top: 24px;
        font-family: Montserrat, sans-serif;
        color: #3d4836;
      }
      .summary {
        font-size: 11px;
        color: #6b7163;
        line-height: 16px;
      }
      .controls {
        display: flex;
        justify-content: center;
        gap: 4px;
        align-items: center;
        max-width: 100%;
      }
      button {
        display: grid;
        place-items: center;
        min-width: 36px;
        min-height: 36px;
        padding: 6px;
        border: 1px solid #d5dace;
        border-radius: 8px;
        background: transparent;
        color: inherit;
        font:
          500 12px Montserrat,
          sans-serif;
        cursor: pointer;
      }
      svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.6;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      button[aria-current='page'] {
        background: #3d4836;
        border-color: #3d4836;
        color: white;
      }
      button:hover:not(:disabled) {
        background: #edf0e7;
      }
      button[aria-current='page']:hover {
        background: #526047;
      }
      button:disabled {
        opacity: 0.4;
        cursor: default;
      }
      button:focus-visible {
        outline: 2px solid #657550;
        outline-offset: 2px;
      }
      .controls > span {
        min-width: 14px;
        text-align: center;
        font-size: 12px;
      }
      @media (pointer: coarse) {
        button {
          min-height: 44px;
        }
      }
      @media (max-width: 540px) {
        button {
          min-width: 32px;
          padding: 4px;
        }
        .controls > span {
          min-width: 10px;
        }
      }
      @media (max-width: 360px) {
        .controls {
          gap: 2px;
          flex-wrap: wrap;
        }
      }
    `,
  ],
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
