import { FormControl } from '@angular/forms';
export const money = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export function parsePrice(text: string): number | null {
  const value = text.trim().replace(/^R\$\s*/, '');
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)) return null;
  const amount = Number(value.replace(/\./g, '').replace(',', '.'));
  return amount > 0 && amount <= 99999999.99 ? amount : null;
}
export function maskPriceInput(
  event: Event,
  control: FormControl<string>,
): void {
  const input = event.target as HTMLInputElement;
  const after = input.value
    .slice(input.selectionStart ?? input.value.length)
    .replace(/\D/g, '').length;
  const digits = input.value
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 10);
  const formatted = digits ? money.format(Number(digits) / 100) : '';
  control.setValue(formatted);
  input.value = formatted;
  let cursor = formatted.length,
    remaining = after;
  while (cursor > 0 && remaining > 0) {
    cursor--;
    if (/\d/.test(formatted[cursor])) remaining--;
  }
  input.setSelectionRange(cursor, cursor);
}
