export function splitInstallments(totalCents: number, count: number): number[] {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0 || !Number.isInteger(count) || count < 1 || count > 6) throw new RangeError('Parcelamento inválido.');
  const base = Math.floor(totalCents / count), remainder = totalCents % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}
export function installmentSummary(totalCents: number, count?: number | null): string {
  if (count === null || count === undefined) return 'Parcelamento não registrado';
  const amounts = splitInstallments(totalCents, count), groups = new Map<number, number>();
  for (const amount of amounts) groups.set(amount, (groups.get(amount) ?? 0) + 1);
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  return [...groups].map(([amount, units]) => `${units}x de ${money.format(amount / 100)}`).join(' + ') + (count > 1 ? ' sem juros' : '');
}
