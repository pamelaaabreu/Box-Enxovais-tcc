export function splitInstallments(totalCents: number, count: number): number[] {
  // Valida o valor e a quantidade de parcelas.
  if (
    !Number.isSafeInteger(totalCents) ||
    totalCents < 0 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 6
  ) {
    throw new RangeError('Parcelamento inválido.');
  }

  // Calcula o valor base de cada parcela.
  const base = Math.floor(totalCents / count);

  // Identifica os centavos restantes.
  const remainder = totalCents % count;

  // Distribui os centavos restantes entre as primeiras parcelas.
  return Array.from(
    { length: count },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

export function installmentSummary(
  totalCents: number,
  count?: number | null,
): string {
  if (count === null || count === undefined) {
    return 'Parcelamento não registrado';
  }

  const amounts = splitInstallments(totalCents, count);

  // Agrupa parcelas com o mesmo valor.
  const groups = new Map<number, number>();

  for (const amount of amounts) {
    groups.set(amount, (groups.get(amount) ?? 0) + 1);
  }

  const money = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  // Formata os grupos de parcelas.
  return (
    [...groups]
      .map(([amount, units]) => `${units}x de ${money.format(amount / 100)}`)
      .join(' + ') + (count > 1 ? ' sem juros' : '')
  );
}
