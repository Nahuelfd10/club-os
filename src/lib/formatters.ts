const integerFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export function formatInteger(value: number) {
  return integerFormatter.format(value);
}

export function formatMoney(value: number, options?: { withCurrencySymbol?: boolean }) {
  const formatted = integerFormatter.format(value);

  if (options?.withCurrencySymbol === false) {
    return formatted;
  }

  return `$${formatted}`;
}
